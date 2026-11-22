import type {CardDisclosure} from "./card-planner";
import type {ScenarioLanguage} from "./scenario-model";
/** No inference from selected answers; missing provenance remains unknown even after a newly recorded opening. */
export function normalizeCardDisclosure(r:{disclosure?:Omit<CardDisclosure,"historyStatus">&{historyStatus?:CardDisclosure["historyStatus"]}}):CardDisclosure{
 return {historyStatus:r.disclosure?.historyStatus==="recorded"?"recorded":"legacy_unknown",
  revision:r.disclosure?.revision??0,opened:(r.disclosure?.opened??[]).map(o=>({...o}))};
}
export const scenarioDisclosureUnknownNotice:Record<ScenarioLanguage,string>={
 ko:"과거 공개 이력이 미확인입니다. 확인된 공개 기록 외의 추가상황은 가리며, 답안 선택으로 공개 여부를 추정하지 않습니다.",
 en:"Earlier opening history is unknown. Changes without a recorded opening stay hidden; answer choices do not prove an opening.",
 ja:"過去の公開履歴は未確認です。公開記録のない追加状況は隠し、回答の選択から公開済みとは推定しません。",
 "zh-CN":"过去的公开记录尚未确认。没有已确认公开记录的追加情境保持隐藏，不根据答案选择推断曾经公开。",
 vi:"Lịch sử mở trước đây chưa rõ. Tình huống thay đổi chưa có bản ghi mở vẫn ẩn; không suy ra việc mở từ lựa chọn trả lời.",
 th:"ยังไม่ทราบประวัติการเปิดเผยเดิม สถานการณ์เพิ่มเติมที่ไม่มีบันทึกจะยังถูกซ่อน และไม่อนุมานจากคำตอบที่เลือก",
 "zh-TW":"過去的公開紀錄尚未確認。沒有已確認公開紀錄的追加情境保持隱藏，不根據答案選擇推斷曾經公開。",
 mn:"Өмнөх нээлтийн түүх тодорхойгүй. Нээгдсэн бүртгэлгүй нэмэлт нөхцөлийг нууна; хариултын сонголтоос нээгдсэн гэж дүгнэхгүй.",
 ru:"Предыдущая история открытия неизвестна. Изменения без подтверждённой записи скрыты; выбор ответа не доказывает открытие.",
 km:"ប្រវត្តិបើកបង្ហាញពីមុនមិនទាន់ដឹង។ ស្ថានភាពបន្ថែមដែលគ្មានកំណត់ត្រានៅតែលាក់ ហើយមិនសន្និដ្ឋានពីចម្លើយដែលបានជ្រើសទេ។",
 ar:"سجل الكشف السابق غير معروف. تبقى التغييرات بلا سجل كشف مؤكّد مخفية، ولا يُستنتج الكشف من اختيار الإجابة.",
 es:"El historial anterior es desconocido. Los cambios sin apertura registrada siguen ocultos; una respuesta elegida no demuestra su apertura.",
 fr:"L’historique antérieur est inconnu. Les changements sans ouverture enregistrée restent masqués ; le choix d’une réponse ne prouve pas leur ouverture.",
 it:"La cronologia precedente è sconosciuta. Le modifiche senza apertura registrata restano nascoste; una risposta scelta non prova l’apertura.",
 az:"Əvvəlki açılış tarixçəsi məlum deyil. Açılış qeydi olmayan dəyişikliklər gizli qalır; cavab seçimi açılışı sübut etmir.",
};
