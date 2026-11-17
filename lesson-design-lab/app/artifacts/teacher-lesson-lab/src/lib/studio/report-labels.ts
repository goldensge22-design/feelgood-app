import { txLang } from '@/i18n/tx';

// New report-history UI only. Original report titles, reasons and source text are never translated.
const keys = ['history', 'current', 'revision', 'legacy', 'basis', 'unknown', 'none'] as const;
const labels: Record<string, string[]> = {
  ko: ['결과지 저장 이력', '현재 결과', '저장 버전', '기존 저장본 · 과거 저장 시각 미확인', '자료 생성 당시 결과', '이전 생성 근거 미기록 · 현재 결과로 추정하지 않음', '결과지 없이 생성'],
  en: ['Report save history', 'Current report', 'Saved revision', 'Existing saved report · earlier save time unknown', 'Report used when creating materials', 'Earlier basis not recorded · not inferred from the current report', 'Created without a report'],
  ja: ['結果票の保存履歴', '現在の結果票', '保存版', '既存の保存結果票・過去の保存日時は不明', '教材作成時の結果票', '過去の根拠は未記録・現在の結果から推定しません', '結果票なしで作成'],
  'zh-CN': ['结果报告保存记录', '当前报告', '保存版本', '现有已存报告·此前保存时间不明', '生成资料时使用的报告', '此前依据未记录·不根据当前报告推断', '未使用报告生成'],
  'zh-TW': ['結果報告儲存紀錄', '目前報告', '儲存版本', '現有已存報告・先前儲存時間不明', '產生資料時使用的報告', '先前依據未記錄・不根據目前報告推斷', '未使用報告產生'],
  mn: ['Тайлан хадгалсан түүх', 'Одоогийн тайлан', 'Хадгалсан хувилбар', 'Өмнө хадгалсан тайлан · өмнөх хадгалсан цаг тодорхойгүй', 'Материал үүсгэхэд ашигласан тайлан', 'Өмнөх үндэслэл бүртгэгдээгүй · одоогийн тайлангаас таамаглахгүй', 'Тайлангүйгээр үүсгэсэн'],
  th: ['ประวัติการบันทึกรายงาน', 'รายงานปัจจุบัน', 'รุ่นที่บันทึก', 'รายงานที่บันทึกไว้เดิม · ไม่ทราบเวลาบันทึกก่อนหน้า', 'รายงานที่ใช้ขณะสร้างเอกสาร', 'ไม่ได้บันทึกข้อมูลอ้างอิงเดิม · ไม่อนุมานจากรายงานปัจจุบัน', 'สร้างโดยไม่มีรายงาน'],
  vi: ['Lịch sử lưu báo cáo', 'Báo cáo hiện tại', 'Phiên bản đã lưu', 'Báo cáo đã lưu từ trước · chưa rõ thời điểm lưu trước đây', 'Báo cáo dùng khi tạo tài liệu', 'Chưa ghi nhận căn cứ trước đây · không suy đoán từ báo cáo hiện tại', 'Được tạo khi chưa có báo cáo'],
  ar: ['سجل حفظ التقارير', 'التقرير الحالي', 'النسخة المحفوظة', 'تقرير محفوظ سابقًا · وقت الحفظ السابق غير معروف', 'التقرير المستخدم عند إنشاء المواد', 'المرجع السابق غير مسجل · لا يُستنتج من التقرير الحالي', 'أُنشئ دون تقرير'],
  ru: ['История сохранения отчёта', 'Текущий отчёт', 'Сохранённая версия', 'Ранее сохранённый отчёт · прежнее время сохранения неизвестно', 'Отчёт при создании материалов', 'Прежнее основание не записано · не выводится из текущего отчёта', 'Создано без отчёта'],
  km: ['ប្រវត្តិរក្សាទុករបាយការណ៍', 'របាយការណ៍បច្ចុប្បន្ន', 'កំណែដែលបានរក្សាទុក', 'របាយការណ៍ដែលមានស្រាប់ · មិនដឹងពេលរក្សាទុកពីមុន', 'របាយការណ៍ដែលប្រើពេលបង្កើតឯកសារ', 'មិនបានកត់ត្រាមូលដ្ឋានពីមុន · មិនសន្និដ្ឋានពីរបាយការណ៍បច្ចុប្បន្ន', 'បានបង្កើតដោយគ្មានរបាយការណ៍'],
  es: ['Historial de guardado del informe', 'Informe actual', 'Versión guardada', 'Informe ya guardado · fecha anterior desconocida', 'Informe usado al crear los materiales', 'Base anterior no registrada · no se deduce del informe actual', 'Creado sin informe'],
  fr: ['Historique des enregistrements du rapport', 'Rapport actuel', 'Version enregistrée', 'Rapport déjà enregistré · date antérieure inconnue', 'Rapport utilisé à la création des supports', 'Référence antérieure non enregistrée · non déduite du rapport actuel', 'Créé sans rapport'],
  it: ['Cronologia dei salvataggi del rapporto', 'Rapporto attuale', 'Versione salvata', 'Rapporto già salvato · data precedente sconosciuta', 'Rapporto usato alla creazione dei materiali', 'Riferimento precedente non registrato · non dedotto dal rapporto attuale', 'Creato senza rapporto'],
  az: ['Hesabatın saxlanma tarixçəsi', 'Cari hesabat', 'Saxlanmış versiya', 'Əvvəldən saxlanmış hesabat · əvvəlki saxlanma vaxtı məlum deyil', 'Material yaradılarkən istifadə olunan hesabat', 'Əvvəlki əsas qeydə alınmayıb · cari hesabatdan təxmin edilmir', 'Hesabatsız yaradılıb'],
};
export const reportLabel = (key: typeof keys[number], lang = txLang()) => (labels[lang] ?? labels.ko)[keys.indexOf(key)];
