// SERVER ONLY. Uses the host's existing PostgreSQL pool; no second credentials.
import {BridgeError} from './planner-lab-bridge.mjs';
export const plannerLabMigration=`
CREATE TABLE IF NOT EXISTS planner_lab_requests(id text PRIMARY KEY,config text NOT NULL);
CREATE TABLE IF NOT EXISTS planner_lab_cards(owner text NOT NULL,scope text NOT NULL,id text NOT NULL,version text NOT NULL,data jsonb NOT NULL,PRIMARY KEY(owner,scope,id,version));
CREATE TABLE IF NOT EXISTS planner_lab_activities(id uuid PRIMARY KEY,owner text NOT NULL,scope text NOT NULL,card_id text NOT NULL,version text NOT NULL,revision integer NOT NULL,data jsonb NOT NULL,UNIQUE(owner,scope,card_id,version));
CREATE TABLE IF NOT EXISTS planner_lab_answer_history(activity_id uuid NOT NULL REFERENCES planner_lab_activities(id),revision integer NOT NULL,data jsonb NOT NULL,PRIMARY KEY(activity_id,revision));
CREATE INDEX IF NOT EXISTS planner_lab_activity_owner_scope ON planner_lab_activities(owner,scope);
`;
export function createPlannerLabPgStore(pool){
 const first=async(sql,params)=>(await pool.query(sql,params)).rows[0]?.data??null;
 const activityForCard=(owner,scope,id,version)=>first('SELECT data FROM planner_lab_activities WHERE owner=$1 AND scope=$2 AND card_id=$3 AND version=$4',[owner,scope,id,version]);
 return {
  async checkRequest(id,config){await pool.query('INSERT INTO planner_lab_requests VALUES($1,$2) ON CONFLICT DO NOTHING',[id,config]);const r=await pool.query('SELECT config FROM planner_lab_requests WHERE id=$1',[id]);if(r.rows[0]?.config!==config)throw new BridgeError(409,'request_content_conflict');},
  async saveCards(cards){const client=await pool.connect();try{await client.query('BEGIN');for(const c of cards)await client.query('INSERT INTO planner_lab_cards VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING',[c.owner,c.scopeId,c.id,c.version,JSON.stringify(c)]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}},
  card:(owner,scope,id,version)=>first('SELECT data FROM planner_lab_cards WHERE owner=$1 AND scope=$2 AND id=$3 AND version=$4',[owner,scope,id,version]),activityForCard,
  async register(a){await pool.query('INSERT INTO planner_lab_activities VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(owner,scope,card_id,version) DO NOTHING',[a.id,a.owner,a.scopeId,a.card.id,a.card.version,a.revision,JSON.stringify(a)]);return activityForCard(a.owner,a.scopeId,a.card.id,a.card.version);},
  activity:(owner,scope,id)=>first('SELECT data FROM planner_lab_activities WHERE owner=$1 AND scope=$2 AND id=$3',[owner,scope,id]),
  async list(owner,scope){return (await pool.query("SELECT data FROM planner_lab_activities WHERE owner=$1 AND scope=$2 ORDER BY data->>'registeredAt' DESC",[owner,scope])).rows.map(r=>r.data);},
  async update(a,revision){const client=await pool.connect();try{
   await client.query('BEGIN');const r=await client.query('UPDATE planner_lab_activities SET revision=$1,data=$2::jsonb WHERE id=$3 AND owner=$4 AND scope=$5 AND revision=$6',[a.revision,JSON.stringify(a),a.id,a.owner,a.scopeId,revision]);
   if(!r.rowCount)throw new BridgeError(409,'answer_revision_conflict');
   await client.query('INSERT INTO planner_lab_answer_history VALUES($1,$2,$3::jsonb)',[a.id,a.revision,JSON.stringify({at:a.savedAt,answers:a.answers})]);await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}},
 };
}
