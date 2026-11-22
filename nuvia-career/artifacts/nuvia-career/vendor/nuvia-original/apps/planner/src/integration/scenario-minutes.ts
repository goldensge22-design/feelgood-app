/** The v1.3 timed decision schema fixes recommendedMinutes at 20. Other
 * legacy scenarios have no known estimate: do not invent the default 15. */
export function scenarioMinutes(payload:Record<string,unknown>):number|null{
 const plan=payload.plan as {minutes?:unknown}|undefined;
 if(typeof plan?.minutes==='number'&&Number.isInteger(plan.minutes)&&plan.minutes>=1&&plan.minutes<=1440)return plan.minutes;
 const decision=payload.decision as {contract?:string}|undefined;
 return decision?.contract==='selected-decision-register/1.0'?20:null;
}
