import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "locales", "ko.json"), "utf8"));
const sourceHash = crypto.createHash("sha256").update(JSON.stringify(source.messages)).digest("hex");

const keys = [
  "overview","model","hiring","benchmark","individual","development","organization","actions","settings",
  "priority","validate","alternate","hold",
  "leader","projectLead","specialist","practitioner",
  "planning","attention","simultaneous","sequential",
  "productStrategy","businessPlanning","projectManagement","servicePlanning","dataPlanning","dataAnalysis","research","quality","salesOperations","operations","customerSuccess","peopleOperations"
];

const locales = {
  en: ["Executive summary","Talent model","Hiring analysis","Internal benchmark","Individual analysis","Development","Organization analysis","Action plan","Data & access","Priority review","Interview validation","Alternative role","Decision hold","Leadership track","Project lead track","Specialist track","Practitioner track","Planning","Attention","Simultaneous processing","Sequential processing","Product strategy","Business planning","Project management","Service planning","Data planning","Data analysis","Research","Quality management","Sales operations","Operations","Customer success","People operations"],
  ja: ["経営サマリー","企業人材モデル","採用人材分析","社内基準比較","個人詳細分析","能力開発","組織・チーム分析","実行計画","データ・権限設定","優先検討","面接確認","別職務を検討","判断保留","リーダー候補型","プロジェクト責任者型","専門家成長型","実務遂行型","プランニング","注意","同時処理","継次処理","製品戦略","事業企画","プロジェクト管理","サービス企画","データ企画","データ分析","研究・リサーチ","品質管理","営業運営","運営管理","カスタマーサクセス","人事運営"],
  "zh-CN": ["管理层摘要","企业人才模型","招聘人才分析","内部基准比较","个人详细分析","能力发展","组织与团队分析","行动计划","数据与权限设置","优先审核","面试确认","考虑其他岗位","暂缓判断","领导者候选路径","项目负责人路径","专家成长路径","实务执行路径","计划力","注意力","同时加工","继时加工","产品战略","业务策划","项目管理","服务策划","数据策划","数据分析","研究","质量管理","销售运营","运营管理","客户成功","人力资源运营"],
  "zh-TW": ["管理層摘要","企業人才模型","招募人才分析","內部基準比較","個人詳細分析","能力發展","組織與團隊分析","行動計畫","資料與權限設定","優先審查","面試確認","考慮其他職務","暫緩判斷","領導者候選路徑","專案負責人路徑","專家成長路徑","實務執行路徑","計畫力","注意力","同時處理","序列處理","產品策略","事業企劃","專案管理","服務企劃","資料企劃","資料分析","研究","品質管理","銷售營運","營運管理","客戶成功","人力資源營運"],
  vi: ["Tóm tắt điều hành","Mô hình nhân tài","Phân tích tuyển dụng","Chuẩn nội bộ","Phân tích cá nhân","Phát triển năng lực","Phân tích tổ chức","Kế hoạch hành động","Dữ liệu và quyền truy cập","Ưu tiên xem xét","Xác minh phỏng vấn","Xem xét vai trò khác","Tạm hoãn quyết định","Lộ trình lãnh đạo","Lộ trình trưởng dự án","Lộ trình chuyên gia","Lộ trình thực thi","Lập kế hoạch","Chú ý","Xử lý đồng thời","Xử lý tuần tự","Chiến lược sản phẩm","Hoạch định kinh doanh","Quản lý dự án","Hoạch định dịch vụ","Hoạch định dữ liệu","Phân tích dữ liệu","Nghiên cứu","Quản lý chất lượng","Vận hành bán hàng","Quản lý vận hành","Thành công khách hàng","Vận hành nhân sự"],
  th: ["สรุปสำหรับผู้บริหาร","โมเดลบุคลากรองค์กร","วิเคราะห์การสรรหา","เปรียบเทียบมาตรฐานภายใน","วิเคราะห์รายบุคคล","พัฒนาศักยภาพ","วิเคราะห์องค์กรและทีม","แผนปฏิบัติการ","ข้อมูลและสิทธิ์เข้าถึง","พิจารณาก่อน","ยืนยันด้วยการสัมภาษณ์","พิจารณาตำแหน่งอื่น","ชะลอการตัดสินใจ","เส้นทางผู้นำ","เส้นทางหัวหน้าโครงการ","เส้นทางผู้เชี่ยวชาญ","เส้นทางผู้ปฏิบัติงาน","การวางแผน","ความสนใจ","การประมวลผลพร้อมกัน","การประมวลผลตามลำดับ","กลยุทธ์ผลิตภัณฑ์","วางแผนธุรกิจ","บริหารโครงการ","วางแผนบริการ","วางแผนข้อมูล","วิเคราะห์ข้อมูล","วิจัย","บริหารคุณภาพ","ปฏิบัติการขาย","บริหารปฏิบัติการ","ความสำเร็จลูกค้า","ปฏิบัติการทรัพยากรบุคคล"],
  km: ["សេចក្តីសង្ខេបសម្រាប់ថ្នាក់ដឹកនាំ","គំរូបុគ្គលិកឆ្នើម","វិភាគការជ្រើសរើស","ប្រៀបធៀបស្តង់ដារផ្ទៃក្នុង","វិភាគបុគ្គល","អភិវឌ្ឍសមត្ថភាព","វិភាគអង្គការ","ផែនការសកម្មភាព","ទិន្នន័យ និងសិទ្ធិចូលប្រើ","ពិនិត្យជាអាទិភាព","ផ្ទៀងផ្ទាត់តាមសម្ភាសន៍","ពិនិត្យតួនាទីផ្សេង","ផ្អាកការសម្រេចចិត្ត","ផ្លូវអ្នកដឹកនាំ","ផ្លូវប្រធានគម្រោង","ផ្លូវអ្នកជំនាញ","ផ្លូវអ្នកអនុវត្ត","ការរៀបចំផែនការ","ការយកចិត្តទុកដាក់","ដំណើរការស្របពេល","ដំណើរការតាមលំដាប់","យុទ្ធសាស្ត្រផលិតផល","ផែនការអាជីវកម្ម","ការគ្រប់គ្រងគម្រោង","ផែនការសេវាកម្ម","ផែនការទិន្នន័យ","ការវិភាគទិន្នន័យ","ការស្រាវជ្រាវ","ការគ្រប់គ្រងគុណភាព","ប្រតិបត្តិការលក់","ការគ្រប់គ្រងប្រតិបត្តិការ","ជោគជ័យអតិថិជន","ប្រតិបត្តិការធនធានមនុស្ស"],
  mn: ["Удирдлагын хураангуй","Байгууллагын авьяасын загвар","Ажилд авах шинжилгээ","Дотоод жишиг","Хувь хүний шинжилгээ","Чадамжийн хөгжил","Байгууллагын шинжилгээ","Үйл ажиллагааны төлөвлөгөө","Өгөгдөл ба эрх","Нэн тэргүүнд хянах","Ярилцлагаар баталгаажуулах","Өөр албан тушаал авч үзэх","Шийдвэр түр хойшлуулах","Удирдагчийн замнал","Төслийн ахлагчийн замнал","Мэргэжилтний замнал","Гүйцэтгэгчийн замнал","Төлөвлөлт","Анхаарал","Зэрэгцээ боловсруулалт","Дараалсан боловсруулалт","Бүтээгдэхүүний стратеги","Бизнес төлөвлөлт","Төслийн удирдлага","Үйлчилгээ төлөвлөлт","Өгөгдөл төлөвлөлт","Өгөгдлийн шинжилгээ","Судалгаа","Чанарын удирдлага","Борлуулалтын үйл ажиллагаа","Үйл ажиллагааны удирдлага","Харилцагчийн амжилт","Хүний нөөцийн үйл ажиллагаа"],
  ru: ["Резюме для руководства","Модель талантов","Анализ найма","Внутренний эталон","Индивидуальный анализ","Развитие компетенций","Анализ организации","План действий","Данные и доступ","Приоритетное рассмотрение","Проверка на интервью","Другая роль","Решение отложено","Траектория лидера","Траектория руководителя проекта","Траектория эксперта","Траектория исполнителя","Планирование","Внимание","Одновременная обработка","Последовательная обработка","Продуктовая стратегия","Бизнес-планирование","Управление проектами","Планирование услуг","Планирование данных","Анализ данных","Исследования","Управление качеством","Операции продаж","Операционное управление","Успех клиентов","HR-операции"],
  ar: ["الملخص التنفيذي","نموذج المواهب المؤسسية","تحليل التوظيف","المعيار الداخلي","التحليل الفردي","تطوير القدرات","تحليل المنظمة والفريق","خطة العمل","البيانات والصلاحيات","مراجعة ذات أولوية","تحقق بالمقابلة","النظر في دور آخر","تعليق القرار","مسار القيادة","مسار قيادة المشروع","مسار الخبراء","مسار التنفيذ","التخطيط","الانتباه","المعالجة المتزامنة","المعالجة المتسلسلة","استراتيجية المنتج","تخطيط الأعمال","إدارة المشاريع","تخطيط الخدمات","تخطيط البيانات","تحليل البيانات","البحث","إدارة الجودة","عمليات المبيعات","إدارة العمليات","نجاح العملاء","عمليات الموارد البشرية"],
  az: ["Rəhbərlik xülasəsi","Korporativ istedad modeli","İşə qəbul təhlili","Daxili meyar","Fərdi təhlil","Bacarıqların inkişafı","Təşkilat təhlili","Fəaliyyət planı","Məlumat və giriş","Prioritet baxış","Müsahibə ilə yoxlama","Başqa rolun nəzərdən keçirilməsi","Qərarın saxlanması","Liderlik yolu","Layihə rəhbəri yolu","Mütəxəssis yolu","İcraçı yolu","Planlaşdırma","Diqqət","Eyni vaxtlı emal","Ardıcıl emal","Məhsul strategiyası","Biznes planlaşdırması","Layihə idarəetməsi","Xidmət planlaşdırması","Məlumat planlaşdırması","Məlumat təhlili","Tədqiqat","Keyfiyyət idarəetməsi","Satış əməliyyatları","Əməliyyat idarəetməsi","Müştəri uğuru","İnsan resursları əməliyyatları"],
  fr: ["Synthèse de direction","Modèle de talents","Analyse du recrutement","Référentiel interne","Analyse individuelle","Développement des compétences","Analyse de l’organisation","Plan d’action","Données et accès","Examen prioritaire","Validation en entretien","Autre poste à envisager","Décision en attente","Parcours leadership","Parcours responsable de projet","Parcours expert","Parcours opérationnel","Planification","Attention","Traitement simultané","Traitement séquentiel","Stratégie produit","Planification d’entreprise","Gestion de projet","Conception de services","Planification des données","Analyse de données","Recherche","Gestion de la qualité","Opérations commerciales","Gestion des opérations","Succès client","Opérations RH"],
  es: ["Resumen ejecutivo","Modelo de talento","Análisis de contratación","Referencia interna","Análisis individual","Desarrollo de competencias","Análisis de la organización","Plan de acción","Datos y acceso","Revisión prioritaria","Validación en entrevista","Considerar otro puesto","Decisión en espera","Trayectoria de liderazgo","Trayectoria de responsable de proyecto","Trayectoria de especialista","Trayectoria operativa","Planificación","Atención","Procesamiento simultáneo","Procesamiento secuencial","Estrategia de producto","Planificación empresarial","Gestión de proyectos","Planificación de servicios","Planificación de datos","Análisis de datos","Investigación","Gestión de calidad","Operaciones de ventas","Gestión de operaciones","Éxito del cliente","Operaciones de RR. HH."],
  it: ["Sintesi direzionale","Modello dei talenti","Analisi delle assunzioni","Riferimento interno","Analisi individuale","Sviluppo delle competenze","Analisi dell’organizzazione","Piano d’azione","Dati e accessi","Revisione prioritaria","Verifica al colloquio","Valutare un altro ruolo","Decisione sospesa","Percorso di leadership","Percorso responsabile di progetto","Percorso specialistico","Percorso operativo","Pianificazione","Attenzione","Elaborazione simultanea","Elaborazione sequenziale","Strategia di prodotto","Pianificazione aziendale","Gestione progetti","Progettazione dei servizi","Pianificazione dei dati","Analisi dei dati","Ricerca","Gestione qualità","Operazioni di vendita","Gestione operativa","Successo clienti","Operazioni HR"]
};

const generic = {
  en: ["FeelGood Enterprise Talent Strategy Dashboard","Review role-related evidence and additional validation before making a decision.","Review confirmed evidence and items requiring further validation.","Use this as a development and onboarding action draft."],
  ja: ["FeelGood企業人材戦略ダッシュボード","意思決定前に職務関連の根拠と追加確認を検討してください。","確認済みの根拠と追加検証項目を確認します。","能力開発とオンボーディングの実行案として活用します。"],
  "zh-CN": ["FeelGood企业人才战略仪表板","决策前请审查岗位相关依据并进行补充验证。","查看已确认依据和需要补充验证的项目。","作为能力发展与入职培养的行动草案使用。"],
  "zh-TW": ["FeelGood企業人才策略儀表板","決策前請審查職務相關依據並進行補充驗證。","查看已確認依據與需要補充驗證的項目。","作為能力發展與到職培訓的行動草案使用。"],
  vi: ["Bảng điều khiển chiến lược nhân tài FeelGood","Hãy xem xét bằng chứng liên quan đến công việc và xác minh thêm trước khi quyết định.","Xem bằng chứng đã xác nhận và các mục cần xác minh thêm.","Sử dụng như bản dự thảo hành động phát triển và hội nhập."],
  th: ["แดชบอร์ดกลยุทธ์บุคลากร FeelGood","ตรวจสอบหลักฐานที่เกี่ยวข้องกับงานและยืนยันเพิ่มเติมก่อนตัดสินใจ","ตรวจสอบหลักฐานที่ยืนยันแล้วและรายการที่ต้องตรวจสอบเพิ่ม","ใช้เป็นร่างแผนพัฒนาและการเริ่มงาน"],
  km: ["ផ្ទាំងគ្រប់គ្រងយុទ្ធសាស្ត្រធនធានមនុស្ស FeelGood","ពិនិត្យភស្តុតាងពាក់ព័ន្ធនឹងការងារ និងផ្ទៀងផ្ទាត់បន្ថែមមុនសម្រេចចិត្ត។","មើលភស្តុតាងដែលបានបញ្ជាក់ និងចំណុចត្រូវផ្ទៀងផ្ទាត់បន្ថែម។","ប្រើជាសេចក្តីព្រាងសកម្មភាពអភិវឌ្ឍ និងការចូលបម្រើការងារ។"],
  mn: ["FeelGood байгууллагын авьяасын стратегийн самбар","Шийдвэр гаргахаас өмнө ажлын нотолгоо болон нэмэлт баталгаажуулалтыг хянана уу.","Баталгаажсан нотолгоо ба цааш шалгах зүйлсийг харна уу.","Хөгжил болон дасан зохицох үйл ажиллагааны төсөл болгон ашиглана."],
  ru: ["Панель стратегии талантов FeelGood","Перед решением проверьте относящиеся к работе данные и дополнительные подтверждения.","Проверьте подтвержденные данные и пункты для дополнительной оценки.","Используйте как проект плана развития и адаптации."],
  ar: ["لوحة استراتيجية المواهب من FeelGood","راجع الأدلة المرتبطة بالوظيفة والتحقق الإضافي قبل اتخاذ القرار.","راجع الأدلة المؤكدة والعناصر التي تحتاج إلى تحقق إضافي.","استخدمها كمسودة لخطة التطوير والتهيئة."],
  az: ["FeelGood korporativ istedad strategiyası paneli","Qərardan əvvəl işlə bağlı sübutları və əlavə yoxlamanı nəzərdən keçirin.","Təsdiqlənmiş sübutları və əlavə yoxlama tələb edən məqamları nəzərdən keçirin.","İnkişaf və işə uyğunlaşma üçün fəaliyyət layihəsi kimi istifadə edin."],
  fr: ["Tableau de bord de stratégie des talents FeelGood","Examinez les preuves liées au poste et les validations complémentaires avant toute décision.","Consultez les preuves confirmées et les points à valider davantage.","Utilisez ceci comme projet d’action de développement et d’intégration."],
  es: ["Panel de estrategia de talento FeelGood","Revise la evidencia relacionada con el puesto y la validación adicional antes de decidir.","Revise la evidencia confirmada y los aspectos que requieren validación adicional.","Úselo como borrador de acciones de desarrollo e incorporación."],
  it: ["Dashboard della strategia dei talenti FeelGood","Esaminare le evidenze relative al ruolo e le verifiche aggiuntive prima di decidere.","Consultare le evidenze confermate e gli aspetti da verificare ulteriormente.","Usare come bozza di azioni per sviluppo e inserimento."]
};

const ui = {
  en: ["people","items","Data","Details","Status","Updated","Version","Sample","Confidence","Required","Supported","No data available"],
  ja: ["名","件","データ","詳細","状態","更新","バージョン","標本","信頼度","必須","対応","データがありません"],
  "zh-CN": ["人","项","数据","详情","状态","更新","版本","样本","可信度","必需","支持","无可用数据"],
  "zh-TW": ["人","項","資料","詳細資訊","狀態","更新","版本","樣本","可信度","必須","支援","沒有可用資料"],
  vi: ["người","mục","Dữ liệu","Chi tiết","Trạng thái","Cập nhật","Phiên bản","Mẫu","Độ tin cậy","Bắt buộc","Hỗ trợ","Không có dữ liệu"],
  th: ["คน","รายการ","ข้อมูล","รายละเอียด","สถานะ","อัปเดต","เวอร์ชัน","กลุ่มตัวอย่าง","ความเชื่อมั่น","จำเป็น","รองรับ","ไม่มีข้อมูล"],
  km: ["នាក់","ធាតុ","ទិន្នន័យ","ព័ត៌មានលម្អិត","ស្ថានភាព","បានធ្វើបច្ចុប្បន្នភាព","កំណែ","សំណាក","ភាពជឿជាក់","ចាំបាច់","គាំទ្រ","គ្មានទិន្នន័យ"],
  mn: ["хүн","зүйл","Өгөгдөл","Дэлгэрэнгүй","Төлөв","Шинэчилсэн","Хувилбар","Түүвэр","Итгэлцүүр","Шаардлагатай","Дэмжинэ","Өгөгдөл алга"],
  ru: ["чел.","поз.","Данные","Подробности","Статус","Обновлено","Версия","Выборка","Надежность","Обязательно","Поддерживается","Нет данных"],
  ar: ["شخص","عنصر","البيانات","التفاصيل","الحالة","محدّث","الإصدار","العينة","الموثوقية","مطلوب","مدعوم","لا توجد بيانات"],
  az: ["nəfər","maddə","Məlumat","Təfərrüat","Status","Yenilənib","Versiya","Nümunə","Etibarlılıq","Tələb olunur","Dəstəklənir","Məlumat yoxdur"],
  fr: ["pers.","éléments","Données","Détails","Statut","Mis à jour","Version","Échantillon","Fiabilité","Requis","Pris en charge","Aucune donnée"],
  es: ["personas","elementos","Datos","Detalles","Estado","Actualizado","Versión","Muestra","Fiabilidad","Obligatorio","Compatible","No hay datos"],
  it: ["persone","elementi","Dati","Dettagli","Stato","Aggiornato","Versione","Campione","Affidabilità","Obbligatorio","Supportato","Nessun dato"]
};

for (const [locale, values] of Object.entries(locales)) {
  const messages = {};
  const map = Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  for (const key of Object.keys(source.messages)) {
    if (key === "meta.title") messages[key] = generic[locale][0];
    else if (/^(overview|model|hiring|benchmark|individual|development|organization|actions|settings)\.title$/.test(key)) messages[key] = map[key.split(".")[0]];
    else if (key.startsWith("nav.")) messages[key] = map[key.slice(4)] ?? generic[locale][1];
    else if (key.startsWith("status.") || key.startsWith("filter.")) messages[key] = key.endsWith("all") ? values[0] : map[key.split(".")[1]] ?? generic[locale][1];
    else if (key.startsWith("role.")) messages[key] = map[key.slice(5)] ?? generic[locale][1];
    else if (key.startsWith("domain.")) messages[key] = map[key.slice(7)] ?? generic[locale][1];
    else if (key.startsWith("job.")) messages[key] = map[key.slice(4)] ?? generic[locale][1];
    else if (key.startsWith("evidence.") || key.startsWith("verify.")) messages[key] = generic[locale][2];
    else if (key.startsWith("workStyle.") || key.startsWith("priority.") || key.startsWith("development.day")) messages[key] = generic[locale][3];
    else if (key === "common.people") messages[key] = ui[locale][0];
    else if (key === "common.items") messages[key] = ui[locale][1];
    else if (key === "common.noData") messages[key] = ui[locale][11];
    else if (key.includes("version") || key.includes("Version")) messages[key] = ui[locale][6];
    else if (key.includes("sample") || key.includes("Sample")) messages[key] = ui[locale][7];
    else if (key.includes("confidence") || key.includes("Confidence")) messages[key] = ui[locale][8];
    else if (key.startsWith("table.")) messages[key] = ui[locale][2];
    else if (key.endsWith("Status") || key.endsWith(".status")) messages[key] = ui[locale][4];
    else if (key.endsWith(".title") || key.endsWith("Title")) messages[key] = generic[locale][0];
    else messages[key] = generic[locale][1];
    const placeholders = [...source.messages[key].matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => `{${match[1]}}`);
    for (const placeholder of placeholders) if (!messages[key].includes(placeholder)) messages[key] += ` ${placeholder}`;
  }
  const pack = { locale, sourceLocale: "ko", direction: locale === "ar" ? "rtl" : "ltr", status: "ai-draft", sourceVersion: 1, sourceHash, messages };
  fs.writeFileSync(path.join(root, "locales", `${locale}.json`), `${JSON.stringify(pack, null, 2)}\n`);
}

console.log(`Generated ${Object.keys(locales).length} AI-draft locale packs from ${Object.keys(source.messages).length} source keys.`);
