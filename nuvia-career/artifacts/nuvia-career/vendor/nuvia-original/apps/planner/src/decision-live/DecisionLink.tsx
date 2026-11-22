// 플래너 Studio 화면에 붙는 「판단형 활동」 링크. studio/ 밖에 둔다 — studio/ 안의 한국어 문자열은 번역 매크로가 키로 바꿔
// 번역 목록에 없으면 화면 전체가 멈춘다(2026-11-14 운영 빈 화면 사고).
export default function DecisionLink(){
 return <p className="st-note"><a className="st-link" data-testid="link-decision-live" href="./decision.html">판단형 활동(기업 LAB 결정 카드) 열기</a></p>;
}
