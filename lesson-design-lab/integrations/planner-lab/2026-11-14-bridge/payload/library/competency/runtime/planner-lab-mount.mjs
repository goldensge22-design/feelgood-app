// Server composition for the central NUVIA host (Node/Express middleware).
import {createPlannerLabBridge} from './planner-lab-bridge.mjs';
import {createPlannerLabPgStore,plannerLabMigration} from './planner-lab-pg-store.mjs';
import {createPlannerLabHttp,createLabTransport} from './planner-lab-http.mjs';
export function createPlannerLabModule({pool,authenticate,verifyMutation,loadOwnedContext,assertSessionCurrent,credentialFor,labOrigin,registeredProfileIds}){
 for(const [name,value] of Object.entries({authenticate,verifyMutation,loadOwnedContext,assertSessionCurrent,credentialFor}))if(typeof value!=='function')throw Error(`${name}_required`);
 if(!pool||!labOrigin||!registeredProfileIds?.length)throw Error('planner_lab_configuration_required');
 const store=createPlannerLabPgStore(pool);
 const labRequest=createLabTransport({origin:labOrigin,credentialFor});
 const bridge=createPlannerLabBridge({store,loadContext:loadOwnedContext,labRequest,assertCurrent:assertSessionCurrent,registeredProfileIds});
 return {handler:createPlannerLabHttp({bridge,authenticate,verifyMutation}),bridge,migration:plannerLabMigration};
}
