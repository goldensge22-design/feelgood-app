import {describe,expect,it} from 'vitest';
import {DEMOS,profileKey,resolveTraining,type TrainingRecord} from '../adaptive/engine';
import {blankWorkspace,createTask,exportWorkspaceJson,restoreWorkspaceJson,scopeFor,uid,validateWorkspace,verifyBackupRoundTrip} from '../adaptive/workspace';

function fixture(){
 const assessment=DEMOS[1],band='A' as const,scope=scopeFor('demo',assessment,band),assignment=resolveTraining(assessment),now='2026-09-20T10:00:00.000Z';
 const task={...createTask('백업 확인 과제','첫 단계'),focusRoute:'step_card' as const,repeat:'daily' as const,transferUsed:true,domain:'학습' as const,materials:[{id:uid(),title:'자료',done:true}],steps:[{id:uid(),title:'첫 단계',done:true,date:''}],status:'done' as const,completedAt:now,actualMinutes:20,help:'none' as const,adjustment:'다음에도 단계로 나누기'};
 const real:TrainingRecord={id:uid(),createdAt:now,kind:'real_task',source:'self_report',context:{mode:'demo',assessmentId:assessment.assessmentId,subjectId:assessment.subjectId,profileVersion:assessment.profileVersion,profileKey:profileKey(assessment),band,route:assignment.route,target:assignment.target,support:assignment.support,rulesVersion:'planner-2.0',axes:assessment.axes,transfer:assessment.transfer!,strategyId:assessment.transfer!.strategyId},measures:{taskId:task.id,taskDomain:'학습',strategyApplied:true,completed:'yes'}};
 const follow:TrainingRecord={id:uid(),createdAt:now,kind:'followup_task',source:'self_report',context:real.context,measures:{previousRecordId:real.id,taskDomain:'생활',previousTaskDomain:'학습',strategyId:assessment.transfer!.strategyId,helpCount:1,completed:'yes',taskContentStored:false}};
 return {scope,workspace:{...blankWorkspace(scope),demoExampleLoaded:true,tasks:[task],records:[real,follow]}};
}
describe('backup restore validation',()=>{
 it('round-trips tasks, steps, materials, completion, repeat, and growth records through the export/restore JSON path',()=>{const {scope,workspace}=fixture();const json=exportWorkspaceJson(workspace,true);expect(restoreWorkspaceJson(json,scope)).toEqual(workspace);expect(verifyBackupRoundTrip(workspace,scope)).toEqual(workspace);});
 it('rejects another profile, corrupt JSON, and broken previous-record links',()=>{const {scope,workspace}=fixture();expect(()=>restoreWorkspaceJson(exportWorkspaceJson({...workspace,scope:'other'}),scope)).toThrow();expect(()=>restoreWorkspaceJson('{',scope)).toThrow('백업 JSON이 손상');const broken=structuredClone(workspace);broken.records[1].measures.previousRecordId='missing';expect(()=>validateWorkspace(broken,scope)).toThrow('이전 적용 기록 연결 오류');});
});
