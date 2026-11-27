import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";

export const subjects = [
  { id: "demo-child", label: "가상 어린이 A", ageBand: "child" as const },
  { id: "demo-teen", label: "가상 청소년 B", ageBand: "teen" as const },
  { id: "demo-adult", label: "가상 성인 C", ageBand: "adult" as const },
  { id: "demo-unlinked", label: "가상 담당 외 학생", ageBand: "unknown" as const },
];
export const accounts = {
  parent: { role: "parent", subjectIds: ["demo-child", "demo-teen"] },
  child: { role: "self", subjectIds: ["demo-child"] },
  teen: { role: "self", subjectIds: ["demo-teen"] },
  adult: { role: "self", subjectIds: ["demo-adult"] },
  teacher: { role: "teacher", subjectIds: ["demo-child"] },
} as const;
export type Account = keyof typeof accounts;
export type Actor = { account: Account; space: string; role: "parent" | "self" | "teacher"; subjectIds: readonly string[]; expiresAt: string };
export const validSpace = (s: string) => /^(visitor|legacy|qa-[a-zA-Z0-9-]{1,80})$/.test(s);
export const workspaceKey = (subjectId: string, actor: Actor) => actor.space === "legacy" ? subjectId : `${actor.space}:${subjectId}`;
const cookieName = "nuvia_review";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
function tokenFrom(req: Request) {
  return req.headers.cookie?.split(";").map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
}
export async function readActor(req: Request): Promise<Actor | null> {
  const token = tokenFrom(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { rows } = await pool.query("SELECT account, expires_at FROM nuvia_review_sessions WHERE token_hash=$1 AND expires_at>now()", [hash(token)]);
  const row = rows[0];
  if (!row) return null;
  // Old session rows retain their original, unmodified legacy dataset.
  const [space, rawAccount] = row.account.includes(":") ? row.account.split(":") : ["legacy", row.account];
  if (!validSpace(space) || !(rawAccount in accounts)) return null;
  const account = rawAccount as Account;
  return { account, space, ...accounts[account], expiresAt: new Date(row.expires_at).toISOString() };
}
export function sessionView(actor: Actor | null) {
  return actor ? {
    authenticated: true, account: actor.account, space: actor.space, role: actor.role, expiresAt: actor.expiresAt,
    subjects: subjects.filter(s => actor.subjectIds.includes(s.id)),
  } : { authenticated: false, subjects: [] };
}
export async function enterReview(req: Request, res: Response, account: Account, space = "visitor") {
  if (!validSpace(space)) throw new ReviewError(400, "invalid_input");
  const oldToken = tokenFrom(req);
  if (oldToken) await pool.query("DELETE FROM nuvia_review_sessions WHERE token_hash=$1", [hash(oldToken)]);
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await pool.query("INSERT INTO nuvia_review_sessions(token_hash,account,expires_at) VALUES($1,$2,$3)", [hash(token), `${space}:${account}`, expiresAt]);
  res.cookie(cookieName, token, {
    httpOnly: true, sameSite: "lax", secure: req.secure || req.get("x-forwarded-proto") === "https",
    path: "/api/nuvia", maxAge: 30 * 60 * 1000,
  });
  return sessionView({ account, space, ...accounts[account], expiresAt: expiresAt.toISOString() });
}
export async function leaveReview(req: Request, res: Response) {
  const token = tokenFrom(req);
  if (token) await pool.query("DELETE FROM nuvia_review_sessions WHERE token_hash=$1", [hash(token)]);
  res.clearCookie(cookieName, { path: "/api/nuvia" });
}
export function assertScope(actor: Actor | null, subjectId: string, teacher = false): asserts actor is Actor {
  if (!actor) throw new ReviewError(401, "session_required");
  if ((actor.role === "teacher") !== teacher || !actor.subjectIds.includes(subjectId)) {
    throw new ReviewError(403, "forbidden");
  }
}
export class ReviewError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
