// SERVER ONLY. Durable single-host SQLite implementation. Multi-instance hosts
// should port the same unique/CAS operations to their shared PostgreSQL database.
import {DatabaseSync} from 'node:sqlite';
import {BridgeError} from './planner-lab-bridge.mjs';
export function createPlannerLabStore(filename){
 const db=new DatabaseSync(filename);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS planner_lab_requests(id TEXT PRIMARY KEY,config TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS planner_lab_cards(owner TEXT,scope TEXT,id TEXT,version TEXT,data TEXT NOT NULL,PRIMARY KEY(owner,scope,id,version));
 CREATE TABLE IF NOT EXISTS planner_lab_activities(id TEXT PRIMARY KEY,owner TEXT,scope TEXT,card_id TEXT,version TEXT,revision INTEGER,data TEXT NOT NULL,UNIQUE(owner,scope,card_id,version));
 CREATE TABLE IF NOT EXISTS planner_lab_answer_history(activity_id TEXT,revision INTEGER,data TEXT NOT NULL,PRIMARY KEY(activity_id,revision));`);
 const parse=row=>row?JSON.parse(row.data):null;
 const card=(owner,scope,id,version)=>parse(db.prepare('SELECT data FROM planner_lab_cards WHERE owner=? AND scope=? AND id=? AND version=?').get(owner,scope,id,version));
 const activityForCard=(owner,scope,id,version)=>parse(db.prepare('SELECT data FROM planner_lab_activities WHERE owner=? AND scope=? AND card_id=? AND version=?').get(owner,scope,id,version));
 return {close:()=>db.close(),card,activityForCard,
  checkRequest(id,config){db.prepare('INSERT OR IGNORE INTO planner_lab_requests VALUES(?,?)').run(id,config);if(db.prepare('SELECT config FROM planner_lab_requests WHERE id=?').get(id).config!==config)throw new BridgeError(409,'request_content_conflict');},
  saveCards(cards){for(const c of cards)db.prepare('INSERT OR IGNORE INTO planner_lab_cards VALUES(?,?,?,?,?)').run(c.owner,c.scopeId,c.id,c.version,JSON.stringify(c));},
  register(a){db.prepare('INSERT OR IGNORE INTO planner_lab_activities VALUES(?,?,?,?,?,?,?)').run(a.id,a.owner,a.scopeId,a.card.id,a.card.version,a.revision,JSON.stringify(a));return activityForCard(a.owner,a.scopeId,a.card.id,a.card.version);},
  activity:(owner,scope,id)=>parse(db.prepare('SELECT data FROM planner_lab_activities WHERE owner=? AND scope=? AND id=?').get(owner,scope,id)),
  list:(owner,scope)=>db.prepare('SELECT data FROM planner_lab_activities WHERE owner=? AND scope=? ORDER BY rowid DESC').all(owner,scope).map(parse),
  update(a,revision){
   db.exec('BEGIN IMMEDIATE');try{
    const r=db.prepare('UPDATE planner_lab_activities SET revision=?,data=? WHERE id=? AND owner=? AND scope=? AND revision=?').run(a.revision,JSON.stringify(a),a.id,a.owner,a.scopeId,revision);
    if(!r.changes)throw new BridgeError(409,'answer_revision_conflict');
    db.prepare('INSERT INTO planner_lab_answer_history VALUES(?,?,?)').run(a.id,a.revision,JSON.stringify({at:a.savedAt,answers:a.answers}));db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
  },
 };
}
