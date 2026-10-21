import type { Band } from './engine';
import type { FocusRoute, PlannerTask } from './workspace';

export function focusRouteFor(band: Band, lower: boolean): FocusRoute {
  if (band === 'A') return lower ? 'picture_routine' : 'step_card';
  if (band === 'B') return 'subject_scope';
  if (band === 'C') return 'deadline_triage';
  return 'handoff';
}

export function focusRouteReady(task: PlannerTask, band: Band, lower: boolean, resuming = false): boolean {
  if (task.focusRoute !== focusRouteFor(band, lower) || !task.steps.some(step => !step.done)) return false;
  if (band === 'A' && lower) {
    return task.routeConfirmed === true && task.materials.every(material => material.done);
  }
  if (band === 'A') return task.routeConfirmed === true && task.resumeNote.trim().length > 0;
  if (band === 'B') {
    const planned = task.subject.trim().length > 0 && Boolean(task.learningScope?.trim()) && task.minutes >= 10;
    return planned && (!resuming || (Boolean(task.remainingScope?.trim()) && Boolean(task.nextTenAction?.trim())));
  }
  if (band === 'C') {
    return task.deadlineDecision === 'continue' || (task.deadlineDecision === 'split' && task.steps.length >= 2);
  }
  return task.handoffState !== undefined && task.handoffState !== 'waiting' && task.adjustment.trim().length > 0;
}

export function focusRoutePrompt(task: PlannerTask, band: Band, lower: boolean, resuming = false): string {
  if (band === 'A' && lower) return '준비물과 첫 행동을 확인한 뒤 “준비됐어요”를 눌러 주세요.';
  if (band === 'A') return '지금 할 단계 카드와 돌아올 위치를 직접 정해 주세요.';
  if (band === 'B') return resuming
    ? '남은 범위와 다음 10분 행동을 남겨야 다시 시작할 수 있어요.'
    : '과목·범위·오늘 분량을 모두 정해 주세요.';
  if (band === 'C') return '마감을 비교해 지금 계속할지, 작게 나눌지, 다른 날로 옮길지 판단해 주세요.';
  return '즉시 할 일·답변 대기·확인 요청을 구분하고 인계·후속 메모를 남겨 주세요.';
}
