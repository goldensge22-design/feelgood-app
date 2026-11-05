# v1.5 UI contract

Main agent owns all src/lib/studio/*, src/lib/store.ts, print engine adjustments, docs/rules. Design worker owns new src/pages/studio/*, src/App.tsx routing, shell navigation, dashboard entry tabs, rules UI. Preserve all old routes/data.

Import from @/lib/studio (barrel will be created). Pure mutation functions accept AppState and return AppState; invoke setState(s => function(s,...)). Catch errors and show toast. useApp(s=>s) includes studio. All student content is fictional/local; identity selector is a DEMO ROLE PREVIEW, not real authentication. No external/AI connections.

Types: src/lib/studio/types.ts. Dates ISO; agenda/scheduling offsets measured in minutes from first session, later sessions +1440 each. Formatting use formatOffset(number,course?) helper.

Exports:
- defaultCourse(stage): CourseDraft
- createCourse(s,input:CourseDraft), updateCourse(s,id,patch:Partial<Course>), addDemoRoster(s,courseId,count)
- buildAgenda(course): AgendaRow[]; courseStats(course): {instruction,breaks,test,total,sessions}; visibleCourses(s):Course[]; requireCourse(s,id):Course; switchActor(s,actor)
- saveReport(s,report:ReportSnapshot); saveCompany(s,model:CompanyModel); visibleReports(s,courseId):ReportSnapshot[]
- saveExploration(s,courseId,studentId,data:ExplorationInput); getCandidates(s,courseId,studentId):Candidate[]
- selectCandidate(s,explorationId,candidate,goal,firstAction):AppState
- reviewMission(s,missionId,approve:boolean,note:string); reviseMission(s,id,goal,firstAction,reason):AppState
- registerMission(s,id,forceFailure?:boolean):AppState // stable local planner ID, NEVER remote registration
- recordMission(s,id,record:Mission['record'],status:'in-progress'|'partial'|'performed',helpRequest?:string)
- confirmExperience(s,id,studentConfirmed:boolean)
- addExperience(s,courseId,studentId,fields:{action,result,learning,evidence,simulation,studentConfirmed})
- saveWriting(s,id:string|null,input:WritingInput):AppState // first call creates V1, subsequent updates draft only; original versions immutable
- addWritingVersion(s,id,text,reviewed:boolean):AppState // explicit V2/V3 append, uses selected confirmed facts
- setSharing(s,id,sharing:{v1,experiences,requirements,counselorIds:string[]})
- getWritingView(s,id): {writing:Writing;v1:string;facts:ConfirmedFact[];requirements:string}|null // enforce selected sharing and classroom scope; use in counselor and teacher views, not raw writings
- writingQuestions(s,id):string[] // rule-based missing fact questions, NO AI claim
- draftSuggestion(s,id):string // only chosen student-confirmed facts; PREVIEW then student apply, never auto overwrite; no scores
- saveConsultation(s,id,questions:string[],facts:string[],expressionSuggestions:string)
- confirmFact(s,writingId,factId,approved:boolean)
- finalizeWriting(s,id,checklist:Writing['checklist'])
- counselingSlots(s,courseId):{counselorId,start,end,available:boolean,reason:string}[]
- counselingCapacity(s,courseId):{capacity,students,shortage,requiredCounselors,suggestions:string[]}
- bookSlot(s,writingId,counselorId,start), cancelBooking(s,bookingId)
- interviewQuestions(s,writingId):{kind:'experience'|'hypothetical',question:string}[]
- saveMockInterview(s,input:Omit<MockInterview,'id'|'at'>)
- writingExport(s,id):string // selected share enforced, versions & facts; no PASS scores
- coursePrint(s,courseId,studentIds:string[],kind:'guide'|'blank'|'example'|'summary'|'consultation'|'feedback'|'comparison'|'interview'):MaterialBundle
  uses existing MaterialPages component; frozen pages, student boundaries, writing excluded from common kinds. summary/consultation/comparison private scoped sharing only. Printing via createPortal to body .mat-print-root; use body.mat-printing class and window.print existing proven pattern.

New routes requested: /studio (course create/list, day vs long; exact first tabs middle/high vs uni), /studio/results (PASS and TOP5), /studio/sources, /studio/agenda, /studio/live (exploration + candidates + mission progress/review/experience), /studio/print, /studio/writing (versions/sharing/appointment/consultation/fact confirm/export), /studio/interview, /studio/status. Include active-course selector and clear actor demo preview on ALL studio pages. No state reset/remount on language change. Forms/drafts persist as editable state or autosaved drafts, not only on final Save. Existing18/36 index links remain visible. Day preset forcibly individual, joint grouping only long optional and teacher-confirmed.
