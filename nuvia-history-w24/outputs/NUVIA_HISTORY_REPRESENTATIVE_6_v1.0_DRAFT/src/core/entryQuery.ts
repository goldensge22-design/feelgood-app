// Routing only: query parameters never clear stored learner work.
export function readEntryQuery(search:string, supportedMission:string){
 const query=new URLSearchParams(search);
 const requested=query.get('mission');
 if(requested!==null&&requested!==supportedMission)throw Error('MISSION_NOT_SUPPORTED');
 return {missionId:requested??supportedMission,fresh:query.get('new')==='1'};
}
