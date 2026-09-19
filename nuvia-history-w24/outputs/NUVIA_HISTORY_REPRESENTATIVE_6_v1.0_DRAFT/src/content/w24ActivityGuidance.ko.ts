export interface ActivityQuestionGuidance {
 judgement:string;
 passBehavior:string;
 allowedResponses:string;
 helpWhenBlocked:string;
 completionEvidence:string;
}
export interface ActivityGuidance {
 context:string[];
 questions:Record<string,ActivityQuestionGuidance>;
}

export const w24ActivityGuidance:Record<string,ActivityGuidance>={
 'gutenberg.c1':{
  context:['활동 목표: 남은 종이 안에서 인쇄 계획을 세워요.','바뀐 조건: 새로 쓸 인쇄용 종이가 부족해요.'],
  questions:{
   before:{
    judgement:'종이가 부족하다는 사실을 알기 전에 먼저 하려고 했던 행동을 하나 고릅니다.',
    passBehavior:'처음 계획을 분명하게 정합니다.',
    allowedResponses:'내용 고르기, 종이 양 확인하기, 인쇄 차례 정하기를 모두 허용합니다. 정답은 하나가 아닙니다.',
    helpWhenBlocked:'처음 공방에 들어왔다고 생각하고 가장 먼저 손이 갈 일을 골라 보세요.',
    completionEvidence:'첫 계획 한 가지가 사용자의 선택으로 기록됩니다.'
   },
   after:{
    judgement:'종이가 부족한 조건을 반영해 처음 계획을 유지할지 다른 행동으로 바꿀지 정합니다.',
    passBehavior:'제약을 확인하고 계획을 유지하거나 수정합니다.',
    allowedResponses:'세 행동을 모두 허용하며, 처음과 같은 선택도 다른 선택도 가능합니다.',
    helpWhenBlocked:'남은 종이로 일을 계속하려면 지금 가장 먼저 확인하거나 정할 일을 골라 보세요.',
    completionEvidence:'처음 계획과 지금 계획, 유지·변경 여부가 함께 기록됩니다.'
   },
   reason:{
    judgement:'방금 계획을 유지하거나 바꾼 까닭을 직접 표현하거나 이유만 건너뜁니다.',
    passBehavior:'자신이 고려한 조건을 표현합니다. 이유를 건너뛰어도 앞 단계의 계획 수정 기록은 유지됩니다.',
    allowedResponses:'말, 그림, 짧은 글 또는 이유 건너뛰기를 허용하며 내용을 자동 평가하지 않습니다.',
    helpWhenBlocked:'“남은 종이를 보고…”처럼 선택할 때 살핀 한 가지부터 말하거나 그려 보세요.',
    completionEvidence:'사용자 원문·그림·녹음 또는 이유 건너뛰기 상태와 계획 선택이 분리되어 기록됩니다.'
   }
  }
 },
 'gutenberg.c2':{
  context:['활동 목표: 더 많은 사람이 책을 함께 볼 방법을 정해요.','바뀐 조건: 일부 사람은 책을 직접 보기 어려워요.'],
  questions:{
   response:{
    judgement:'책을 함께 보기 위해 가장 먼저 확인해 볼 행동 하나를 고릅니다.',
    passBehavior:'목표와 제약을 연결해 실행할 첫 단계를 정합니다.',
    allowedResponses:'허락 묻기, 함께 볼 시간 찾기, 모일 자리 찾기를 모두 허용합니다. 상황에 따라 다른 선택이 가능합니다.',
    helpWhenBlocked:'친구들과 책 한 권을 함께 보려 한다고 생각하고, 시작 전에 꼭 알아야 할 한 가지를 골라 보세요.',
    completionEvidence:'사용자가 고른 첫 행동 한 가지가 목표·제약과 연결되어 기록됩니다.'
   },
   reason:{
    judgement:'그 행동을 먼저 고른 까닭을 직접 표현하거나 이유만 건너뜁니다.',
    passBehavior:'첫 단계와 고려한 조건을 연결합니다. 이유를 건너뛰어도 첫 단계 선택은 유지됩니다.',
    allowedResponses:'말, 그림, 짧은 글 또는 이유 건너뛰기를 허용하며 내용을 자동 평가하지 않습니다.',
    helpWhenBlocked:'“먼저 이것을 알아야…”처럼 다음 행동을 시작하려면 필요한 점을 말하거나 그려 보세요.',
    completionEvidence:'사용자 원문·그림·녹음 또는 이유 건너뛰기 상태와 첫 행동 선택이 분리되어 기록됩니다.'
   }
  }
 }
};
