import { useState } from 'react';
import type { Grade } from './types';
import { stripAssessmentData } from './recommendation-policy';
import { serverAdapter, IntegrationPendingError, type AiTask } from './server-contract';

export type { AiTask } from './server-contract';

export function gradeGuide(grade: Grade) {
  if (grade === 'middle') return '학생은 중학생입니다. 자기 이해와 짧은 경험 중심으로, 쉬운 말과 짧은 문장으로 안내하세요.';
  if (grade === 'high') return '학생은 고등학생입니다. 학습 과정, 학과 비교, 심화 계획을 구체적으로 다루세요.';
  return '학년 정보가 없습니다. 중고생 모두 이해할 수 있게 쓰세요.';
}

export function useAssist(task: AiTask) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function run(context: Record<string, unknown>, grade: Grade, _image?: string) {
    setError(''); setText(''); setPending(true);
    try {
      const res = await serverAdapter.assist({ task, grade:grade==='middle'||grade==='high'?grade:'', context: stripAssessmentData(context) as Record<string,unknown>,
        ...(typeof context.writingLanguage === 'string' ? { writingLanguage: context.writingLanguage } : {}),
        ...(typeof context.screenLanguage === 'string' ? { screenLanguage: context.screenLanguage } : {}),
      });
      if (res.kind !== 'server-ai-proposal') throw new Error('invalid_response');
      if (!res?.text?.trim()) throw new Error('empty');
      setText(res.text.trim());
    } catch (e) {
      setError(e instanceof IntegrationPendingError ? e.message : '기존 서버 AI 요청이 실패했어요. 생성되거나 저장되지 않았으며 예시 결과로 대체하지 않아요. 직접 작성은 계속할 수 있어요.');
    } finally { setPending(false); }
  }
  return { run, text, error, pending, clear: () => { setText(''); setError(''); } };
}
