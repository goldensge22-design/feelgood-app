# Main-agent / frontend contract

New additive screen only: enhancement.html -> enhancement-main.tsx -> enhancement/App.tsx.
Never edit src/official, src/before, src/previous, existing HTMLs or archives.
Import useLab from ./store and types/labels from ./model; domain helpers from ./domain.

useLab(): {state, student (undefined for teacher), act(command), message, clearMessage(), backup(), restore(file):Promise<void>, loadError}
act returns boolean; failure displays message, state remains unchanged. All commands persist immediately. Roles teacher/student-a/student-b are synthetic demo switches, not auth.
domain exports createLab(), routeFor(student) {target,support,targets,warning}, elapsed(run,now=Date.now()) milliseconds, remaining(run,now) seconds, capacity(student,date) {done,pending,free,total,capacity,over}, evidenceReady(card,run), planSnapshot(card).

Commands `act({type,...})` fields:
- role {actor}, language {language}; student.settings {changes:{dailyCapacity,supportChoice,reduceHelp,difficulty}}; student.comparison {value,note}; student.exploration {changes}
- card.create {title?,subject?,minutes?,scope?,goal?}; card.update {cardId,changes} permitted Card fields including steps and links; card.move {cardId,direction:-1|1}; card.repeat {cardId,repeat}
- card.plan {cardId} explicit student confirms scope/time/first action; card.action {cardId,action} explicit current action selection; card.links {cardId,links:string[],relationship:string} >=2 distinct real items; card.steps {cardId,steps:{id,title,done}[]} >=2 confirmed; card.progress {cardId,stepId}; card.skip {cardId} explicit practice skip
- run.start {cardId,smallAction?:string,feelingBefore?:string} idempotent if same active card, rejects other active/review; always allowed without evidence. All evidence starts unchecked. Emits actual run.
- run.pause {runId}; run.flag {runId,flag}; run.thought {runId,thought}; run.resume {runId}; run.review {runId}; run.close {runId,completion:'yes'|'no',next:'five'|'next'|'today',reflection?,nextMethod?,actualMinutes?,optionalAttention?,feelingAfter?}. completion is required; next required if no; five makes five more minutes, next creates one linked continuation card, today closes. Each ended run preserved; target credit once per practice ID and only evidenceReady. Time expiry never changes state.
- method.save {runId,name,helpful:'yes'|'no'|'unsure',note}; method.choose {methodId,cardId}
- goal.save {id?,far,middle,weekly,date,status}; goal.schedule {goalId}, idempotent one card per goal.
- experience.save {id?,runId?,situation,role,action,result,selected}; first creation requires a real closed run.
- lesson.create {title,template:'45'|'90'|'overnight',minutes?,activities?}; lesson.update {lessonId,changes}; lesson.publish/end {lessonId}; join {code}; leave {lessonId}; lesson.card {lessonId} idempotent one card/student/class
- share.save {lessonId,cardId,fields:{goal?:true,method?:true,reflection?:true,experience?:string}} snapshot only selected fields, excludes schedule, notes, thoughts, assessment. Preview UI must show exact selected text before submit; withdraw {shareId}.
- feedback.save {shareId,text,nextDate}; help.create {lessonId,cardId,point,need}; help.answer {requestId,answer,nextDate}. Teacher only latter/feedback; teacher cannot read student private data in UI. End/leave removes classroom visibility, never private cards.
- qa.profile {stage,axes:{planning,...:high|mid|low},supportOrder?,strengthOrder?,officialType?,withoutAssessment?} only allowed URL ?qa=1; all samples synthetic. Same common task. No QA switches on student normal screens.

State as model.ts. Teacher UI uses state.lessons, state.shared, state.requests only, not state.students private data. Names fixed synthetic labels can be used. Student accesses student only and shared filtered own. Show cross-device/server/auth unavailable. No fetching or external service.

UI: user requested Korean B design, approved navy/cream/orange/blue/purple/sky-blue, real bright narrow top/front/6px solid side and restrained hard shadows; no gradients, excessive animation, gamification. Reuse small FeelGood logo (AdaptivePlanner import points path), big NUVIA PLANNER. Main pages plan / now / reflect / everyday(class-to-life) / class; teacher lesson management. Selected card inline on mobile, single chronological list. Distinct interactive target panels. All controls work through commands.

Age-specific helpers and input burden for five stages; different help presentation without changing assessment. Existing ko-A..D translations untouched. New strings centralize in copy.ts; don't claim unreviewed translations verified. A QA-only long-translation/RTL mode can test layout. Persist language independent of running timer.
