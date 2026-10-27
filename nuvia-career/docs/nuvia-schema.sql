-- Additive NUVIA career tables only. Review against your existing database.
-- Do not drop/truncate other products' tables or apply this to production blindly.
BEGIN;
CREATE TABLE IF NOT EXISTS career_workspaces (
  owner_id text PRIMARY KEY,
  revision integer NOT NULL DEFAULT 0,
  state jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS career_versions (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  request_id text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS career_version_owner_request
  ON career_versions (owner_id, request_id);
COMMIT;
