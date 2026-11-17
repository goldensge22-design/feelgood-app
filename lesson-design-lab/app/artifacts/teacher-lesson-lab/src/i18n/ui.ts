// UI strings: authored translations (machine-assisted authoring by the build agent), NOT human-reviewed.
// Content translations live in src/i18n/content/<lang>.ts (see contract in content/index.ts).
export const LANGS: { code: string; name: string; rtl?: boolean }[] = [
  { code: 'ko', name: '한국어' }, { code: 'en', name: 'English' }, { code: 'ja', name: '日本語' }, { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' }, { code: 'mn', name: 'Монгол' }, { code: 'th', name: 'ไทย' }, { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ar', name: 'العربية', rtl: true }, { code: 'ru', name: 'Русский' }, { code: 'km', name: 'ខ្មែរ' }, { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' }, { code: 'it', name: 'Italiano' }, { code: 'az', name: 'Azərbaycanca' },
];

const K = ['dashboard', 'lessons', 'worksheets', 'students', 'cards', 'camp', 'supports', 'rules', 'save', 'print', 'export', 'import', 'browserSaved', 'notConnected', 'pending', 'middle', 'high', 'university', 'secondary', 'college', 'language', 'tagline'] as const;
export type UIKey = (typeof K)[number];

const T: Record<string, string[]> = {
  ko: ['대시보드', '수업', '활동지', '학생 명단', '개인 직무 카드', '캠프 운영', '수업 지원', '규칙·상태', '저장', '인쇄', '내보내기', '가져오기', '브라우저 저장', '미연동', '한국어 원문 · 번역 대기', '중학생', '고등학생', '대학생', '중고생용', '대학생용', '언어', '진로 결과와 실제 경험으로 수업을 준비합니다'],
  en: ['Dashboard', 'Lessons', 'Worksheets', 'Student roster', 'Job task cards', 'Camp operator', 'Teaching supports', 'Rules & status', 'Save', 'Print', 'Export', 'Import', 'Saved in browser', 'Not connected', 'Korean original · translation pending', 'Middle school', 'High school', 'University', 'Secondary', 'University', 'Language', 'Prepare classes from career reports and real experiences'],
  ja: ['ダッシュボード', '授業', 'ワークシート', '生徒名簿', '個人職務カード', 'キャンプ運営', '授業支援', 'ルール・状態', '保存', '印刷', 'エクスポート', 'インポート', 'ブラウザ保存', '未連携', '韓国語原文・翻訳待ち', '中学生', '高校生', '大学生', '中高生用', '大学生用', '言語', '進路結果と実際の経験から授業を準備します'],
  'zh-CN': ['仪表板', '课程', '学习单', '学生名单', '个人职务卡', '营队运营', '教学支持', '规则与状态', '保存', '打印', '导出', '导入', '浏览器保存', '未连接', '韩语原文 · 待翻译', '初中生', '高中生', '大学生', '中学生用', '大学生用', '语言', '用职业报告和真实经历准备课程'],
  'zh-TW': ['儀表板', '課程', '學習單', '學生名單', '個人職務卡', '營隊營運', '教學支援', '規則與狀態', '儲存', '列印', '匯出', '匯入', '瀏覽器儲存', '未連接', '韓語原文 · 待翻譯', '國中生', '高中生', '大學生', '中學生用', '大學生用', '語言', '用職涯報告與真實經驗準備課程'],
  mn: ['Хянах самбар', 'Хичээл', 'Ажлын хуудас', 'Сурагчдын жагсаалт', 'Хувийн ажлын карт', 'Зуслан удирдах', 'Сургалтын дэмжлэг', 'Дүрэм ба төлөв', 'Хадгалах', 'Хэвлэх', 'Экспорт', 'Импорт', 'Хөтөчид хадгалсан', 'Холбогдоогүй', 'Солонгос эх · орчуулга хүлээгдэж байна', 'Дунд сургууль', 'Ахлах сургууль', 'Их сургууль', 'Дунд, ахлах', 'Их сургууль', 'Хэл', 'Мэргэжлийн тайлан ба бодит туршлагаар хичээл бэлтгэнэ'],
  th: ['แดชบอร์ด', 'บทเรียน', 'ใบงาน', 'รายชื่อนักเรียน', 'การ์ดงานส่วนบุคคล', 'จัดค่าย', 'การสนับสนุนการสอน', 'กฎและสถานะ', 'บันทึก', 'พิมพ์', 'ส่งออก', 'นำเข้า', 'บันทึกในเบราว์เซอร์', 'ไม่ได้เชื่อมต่อ', 'ต้นฉบับภาษาเกาหลี · รอแปล', 'มัธยมต้น', 'มัธยมปลาย', 'มหาวิทยาลัย', 'มัธยม', 'มหาวิทยาลัย', 'ภาษา', 'เตรียมการสอนจากรายงานอาชีพและประสบการณ์จริง'],
  vi: ['Bảng điều khiển', 'Bài học', 'Phiếu học tập', 'Danh sách học sinh', 'Thẻ nhiệm vụ cá nhân', 'Điều hành trại', 'Hỗ trợ giảng dạy', 'Quy tắc & trạng thái', 'Lưu', 'In', 'Xuất', 'Nhập', 'Lưu trong trình duyệt', 'Chưa kết nối', 'Bản gốc tiếng Hàn · chờ dịch', 'THCS', 'THPT', 'Đại học', 'Trung học', 'Đại học', 'Ngôn ngữ', 'Chuẩn bị bài học từ báo cáo nghề nghiệp và trải nghiệm thực tế'],
  ar: ['لوحة التحكم', 'الدروس', 'أوراق العمل', 'قائمة الطلاب', 'بطاقات المهام', 'تشغيل المخيم', 'دعم التدريس', 'القواعد والحالة', 'حفظ', 'طباعة', 'تصدير', 'استيراد', 'محفوظ في المتصفح', 'غير متصل', 'الأصل الكوري · الترجمة قيد الانتظار', 'المرحلة المتوسطة', 'المرحلة الثانوية', 'الجامعة', 'للمدارس', 'للجامعة', 'اللغة', 'حضّر الدروس من تقارير المهنة والتجارب الحقيقية'],
  ru: ['Панель', 'Уроки', 'Рабочие листы', 'Список учеников', 'Карточки заданий', 'Лагерь', 'Поддержка обучения', 'Правила и статус', 'Сохранить', 'Печать', 'Экспорт', 'Импорт', 'Сохранено в браузере', 'Не подключено', 'Корейский оригинал · перевод ожидается', 'Средняя школа', 'Старшая школа', 'Университет', 'Для школ', 'Для вузов', 'Язык', 'Готовьте уроки по профотчётам и реальному опыту'],
  km: ['ផ្ទាំងគ្រប់គ្រង', 'មេរៀន', 'សន្លឹកកិច្ចការ', 'បញ្ជីសិស្ស', 'កាតការងារផ្ទាល់ខ្លួន', 'ដំណើរការជំរំ', 'ការគាំទ្របង្រៀន', 'ច្បាប់ និងស្ថានភាព', 'រក្សាទុក', 'បោះពុម្ព', 'នាំចេញ', 'នាំចូល', 'រក្សាទុកក្នុងកម្មវិធីរុករក', 'មិនបានភ្ជាប់', 'ដើមភាសាកូរ៉េ · រង់ចាំការបកប្រែ', 'អនុវិទ្យាល័យ', 'វិទ្យាល័យ', 'សាកលវិទ្យាល័យ', 'មធ្យមសិក្សា', 'សាកលវិទ្យាល័យ', 'ភាសា', 'រៀបចំមេរៀនពីរបាយការណ៍អាជីព និងបទពិសោធន៍ពិត'],
  es: ['Panel', 'Clases', 'Fichas', 'Lista de estudiantes', 'Tarjetas de tareas', 'Campamento', 'Apoyos docentes', 'Reglas y estado', 'Guardar', 'Imprimir', 'Exportar', 'Importar', 'Guardado en el navegador', 'Sin conexión', 'Original coreano · traducción pendiente', 'Secundaria básica', 'Bachillerato', 'Universidad', 'Secundaria', 'Universidad', 'Idioma', 'Prepara clases a partir de informes y experiencias reales'],
  fr: ['Tableau de bord', 'Séances', 'Fiches', 'Liste des élèves', 'Cartes de tâches', 'Camp', 'Aides pédagogiques', 'Règles et état', 'Enregistrer', 'Imprimer', 'Exporter', 'Importer', 'Enregistré dans le navigateur', 'Non connecté', 'Original coréen · traduction en attente', 'Collège', 'Lycée', 'Université', 'Secondaire', 'Université', 'Langue', 'Préparer des séances à partir des bilans et des expériences réelles'],
  it: ['Pannello', 'Lezioni', 'Schede', 'Elenco studenti', 'Schede compiti', 'Campo', 'Supporti didattici', 'Regole e stato', 'Salva', 'Stampa', 'Esporta', 'Importa', 'Salvato nel browser', 'Non collegato', 'Originale coreano · traduzione in attesa', 'Scuola media', 'Scuola superiore', 'Università', 'Secondaria', 'Università', 'Lingua', 'Prepara lezioni da report e esperienze reali'],
  az: ['İdarə paneli', 'Dərslər', 'İş vərəqləri', 'Şagird siyahısı', 'Tapşırıq kartları', 'Düşərgə', 'Tədris dəstəyi', 'Qaydalar və status', 'Saxla', 'Çap et', 'İxrac', 'İdxal', 'Brauzerdə saxlanılıb', 'Qoşulmayıb', 'Koreya dilində orijinal · tərcümə gözlənilir', 'Orta məktəb', 'Lisey', 'Universitet', 'Məktəb', 'Universitet', 'Dil', 'Karyera hesabatları və real təcrübə ilə dərs hazırlayın'],
};

export function t(lang: string, key: UIKey): string {
  const arr = T[lang] ?? T.ko;
  return arr[K.indexOf(key)] ?? T.ko[K.indexOf(key)];
}
export const isRTL = (lang: string) => !!LANGS.find((l) => l.code === lang)?.rtl;
