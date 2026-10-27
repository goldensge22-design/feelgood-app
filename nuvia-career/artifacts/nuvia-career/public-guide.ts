/** Build-time HTML only. Never reads sessions, environment secrets or account APIs. */
import type { Plugin } from 'vite';
import { PROV_RAW, PROV_LOCALE_ORDER } from './src/lib/provenance-messages';
import { SYNTHETIC_SEEDS, localizeSeed } from './src/lib/synthetic-records';

// Additive machine drafts; native-language review pending. Existing UI translations untouched.
// intro (all examples fictional), flow, real-integration limitations, start CTA.
const COPY: Record<string, [string, string, string, string]> = {
  ko: ['로그인 없이 둘러보는 합성 체험 안내입니다. 실제 수행 사례와 모의 연습 사례 모두 가상 인물의 예시이며 실제 사용자 기록이 아닙니다.',
    '결과 예시 → 직무 준비 기준 → 경험 선택·사실 확인 → 직접 작성·한 질문 코치 → 버전 비교 → DOCX·HWPX·텍스트 내보내기',
    '실제 D-CAS 결과·기존 플래너·계정 서버 저장의 연동 완료를 뜻하지 않습니다. 체험은 탭에만 저장됩니다. 개인정보를 입력하지 마세요.',
    '로그인 없이 합성 체험 시작'],
  en: ['This is a synthetic trial guide without login. Both the actual-performance and simulated-practice examples describe fictional people, not real user records.',
    'Example results → Job readiness criteria → Select experiences and confirm facts → Write yourself with a one-question coach → Compare versions → Export DOCX, HWPX or text',
    'Real D-CAS, existing planner and account-server storage integrations are not claimed complete. Trial records stay in this tab. Do not enter personal information.',
    'Start the synthetic trial without login'],
  ja: ['ログイン不要の架空体験ガイドです。実行例も模擬練習例も架空の人物の例で、実際の利用者の記録ではありません。',
    '結果の例 → 職務準備基準 → 経験の選択・事実確認 → 自分で執筆・一問ずつのコーチ → バージョン比較 → DOCX・HWPX・テキスト出力',
    '実際のD-CAS・既存プランナー・アカウントサーバー保存の連携完了を示すものではありません。体験記録はこのタブ内のみです。個人情報は入力しないでください。',
    'ログインせず架空体験を始める'],
  'zh-CN': ['这是无需登录的虚构体验指南。实际执行案例和模拟练习案例均为虚构人物示例，不是真实用户记录。',
    '结果示例 → 职务准备标准 → 选择经历并确认事实 → 自主写作与单问题教练 → 版本比较 → 导出DOCX、HWPX或文本',
    '不代表已完成真实D-CAS、现有计划工具和账户服务器存储的连接。体验记录仅保存在此标签页。请勿输入个人信息。',
    '无需登录开始虚构体验'],
  'zh-TW': ['這是無需登入的虛構體驗指南。實際執行案例與模擬練習案例均為虛構人物範例，並非真實使用者紀錄。',
    '結果範例 → 職務準備標準 → 選擇經驗並確認事實 → 自主寫作與單問題教練 → 版本比較 → 匯出DOCX、HWPX或文字',
    '不代表已完成真實D-CAS、現有規劃工具與帳戶伺服器儲存的連接。體驗紀錄僅存在此分頁。請勿輸入個人資料。',
    '無需登入開始虛構體驗'],
  mn: ['Нэвтрэх шаардлагагүй зохиомол туршилтын гарын авлага. Бодитоор гүйцэтгэсэн болон загварчилсан дадлагын жишээ хоёул зохиомол хүнийх бөгөөд жинхэнэ хэрэглэгчийн бүртгэл биш.',
    'Үр дүнгийн жишээ → Ажлын бэлтгэлийн шалгуур → Туршлага сонгох ба баримт батлах → Өөрөө бичих ба нэг асуулттай чиглүүлэгч → Хувилбар харьцуулах → DOCX, HWPX эсвэл текст гаргах',
    'Жинхэнэ D-CAS, одоогийн төлөвлөгч болон бүртгэлийн серверийн хадгалалтын холболт дууссан гэж үзэхгүй. Туршилтын бүртгэл зөвхөн энэ табд хадгалагдана. Хувийн мэдээлэл бүү оруул.',
    'Нэвтрэхгүйгээр зохиомол туршилт эхлүүлэх'],
  th: ['คู่มือทดลองด้วยข้อมูลสมมติโดยไม่ต้องเข้าสู่ระบบ ทั้งตัวอย่างการลงมือทำจริงและการฝึกจำลองเป็นเรื่องของบุคคลสมมติ ไม่ใช่บันทึกผู้ใช้จริง',
    'ตัวอย่างผล → เกณฑ์เตรียมความพร้อมงาน → เลือกประสบการณ์และยืนยันข้อเท็จจริง → เขียนเองและโค้ชถามทีละคำถาม → เปรียบเทียบเวอร์ชัน → ส่งออก DOCX, HWPX หรือข้อความ',
    'ไม่ได้หมายความว่าเชื่อมต่อ D-CAS จริง แพลนเนอร์เดิม และการบันทึกบนเซิร์ฟเวอร์บัญชีเสร็จแล้ว บันทึกทดลองอยู่ในแท็บนี้เท่านั้น อย่าป้อนข้อมูลส่วนบุคคล',
    'เริ่มทดลองข้อมูลสมมติโดยไม่เข้าสู่ระบบ'],
  vi: ['Đây là hướng dẫn trải nghiệm giả lập không cần đăng nhập. Cả ví dụ thực hiện thực tế và luyện tập mô phỏng đều nói về nhân vật hư cấu, không phải hồ sơ người dùng thật.',
    'Kết quả mẫu → Tiêu chí chuẩn bị nghề nghiệp → Chọn trải nghiệm và xác nhận sự thật → Tự viết và huấn luyện viên hỏi từng câu → So sánh phiên bản → Xuất DOCX, HWPX hoặc văn bản',
    'Không khẳng định đã tích hợp D-CAS thật, công cụ lập kế hoạch hiện có và lưu máy chủ tài khoản. Bản ghi thử chỉ ở tab này. Không nhập thông tin cá nhân.',
    'Bắt đầu trải nghiệm giả lập không đăng nhập'],
  ar: ['هذا دليل لتجربة اصطناعية دون تسجيل الدخول. أمثلة التنفيذ الفعلي والتدريب المحاكى تخص أشخاصًا خياليين، وليست سجلات مستخدمين حقيقيين.',
    'نتائج نموذجية → معايير الاستعداد الوظيفي → اختيار الخبرات وتأكيد الحقائق → الكتابة بنفسك ومدرب يسأل سؤالًا واحدًا → مقارنة الإصدارات → تصدير DOCX أو HWPX أو نص',
    'لا يعني ذلك اكتمال ربط D-CAS الحقيقي أو المخطط الحالي أو تخزين خادم الحساب. تبقى سجلات التجربة في علامة التبويب هذه فقط. لا تدخل معلومات شخصية.',
    'ابدأ التجربة الاصطناعية دون تسجيل الدخول'],
  ru: ['Это руководство по синтетической пробной версии без входа. Примеры реального выполнения и учебной симуляции относятся к вымышленным людям, а не к настоящим пользователям.',
    'Пример результатов → Критерии подготовки к работе → Выбор опыта и подтверждение фактов → Самостоятельное письмо и один вопрос наставника → Сравнение версий → Экспорт DOCX, HWPX или текста',
    'Это не означает завершения подключения реального D-CAS, существующего планировщика и серверного хранения аккаунтов. Пробные записи остаются только в этой вкладке. Не вводите личные данные.',
    'Начать синтетическую пробу без входа'],
  km: ['នេះជាការណែនាំសាកល្បងដោយទិន្នន័យសំយោគដោយមិនចាំបាច់ចូលគណនី។ ឧទាហរណ៍អនុវត្តជាក់ស្តែង និងហ្វឹកហាត់សាកល្បងសុទ្ធតែជាតួអង្គប្រឌិត មិនមែនកំណត់ត្រាអ្នកប្រើពិតទេ។',
    'លទ្ធផលគំរូ → លក្ខណៈវិនិច្ឆ័យត្រៀមការងារ → ជ្រើសបទពិសោធន៍និងបញ្ជាក់ការពិត → សរសេរដោយខ្លួនឯងនិងគ្រូសួរមួយសំណួរ → ប្រៀបធៀបកំណែ → នាំចេញ DOCX, HWPX ឬអត្ថបទ',
    'មិនមានន័យថាការភ្ជាប់ D-CAS ពិត កម្មវិធីផែនការដែលមាន និងការរក្សាទុកលើម៉ាស៊ីនមេគណនីបានបញ្ចប់ទេ។ កំណត់ត្រាសាកល្បងនៅក្នុងផ្ទាំងនេះប៉ុណ្ណោះ។ កុំបញ្ចូលព័ត៌មានផ្ទាល់ខ្លួន។',
    'ចាប់ផ្តើមសាកល្បងសំយោគដោយមិនចូលគណនី'],
  es: ['Guía de prueba sintética sin iniciar sesión. Tanto los ejemplos de ejecución real como de práctica simulada son de personas ficticias, no registros de usuarios reales.',
    'Resultados de ejemplo → Criterios de preparación laboral → Elegir experiencias y confirmar hechos → Redacción propia y una pregunta del coach → Comparar versiones → Exportar DOCX, HWPX o texto',
    'No se afirma que estén completas las integraciones reales de D-CAS, el planificador existente o el almacenamiento del servidor de cuentas. Los registros quedan solo en esta pestaña. No introduzcas datos personales.',
    'Iniciar prueba sintética sin sesión'],
  fr: ['Guide de démonstration synthétique sans connexion. Les exemples de réalisation réelle et de simulation concernent des personnes fictives, pas de vrais utilisateurs.',
    'Résultats exemples → Critères de préparation au métier → Choix des expériences et confirmation des faits → Rédaction personnelle et une question du coach → Comparaison des versions → Export DOCX, HWPX ou texte',
    "Les intégrations réelles D-CAS, du planificateur existant et du stockage serveur des comptes ne sont pas présentées comme achevées. Les données restent dans cet onglet. Ne saisissez pas de données personnelles.",
    'Démarrer la démonstration sans connexion'],
  it: ['Guida alla prova sintetica senza accesso. Gli esempi di esecuzione reale e di pratica simulata riguardano persone fittizie, non registrazioni di utenti reali.',
    'Risultati di esempio → Criteri di preparazione al lavoro → Scegliere esperienze e confermare i fatti → Scrittura personale e una domanda del coach → Confrontare versioni → Esportare DOCX, HWPX o testo',
    "Non si dichiara completata l'integrazione reale di D-CAS, del pianificatore esistente o del salvataggio sul server degli account. I dati restano solo in questa scheda. Non inserire informazioni personali.",
    'Avvia la prova sintetica senza accesso'],
  az: ['Bu, daxil olmadan sintetik sınaq bələdçisidir. Həm real icra, həm də simulyasiya məşqi nümunələri uydurma şəxslərə aiddir, həqiqi istifadəçi qeydləri deyil.',
    'Nümunə nəticələr → İşə hazırlıq meyarları → Təcrübə seçimi və faktların təsdiqi → Özünüz yazın və məşqçidən bir sual → Versiyaları müqayisə edin → DOCX, HWPX və ya mətn ixracı',
    'Həqiqi D-CAS, mövcud planlayıcı və hesab serverində saxlama inteqrasiyalarının tamamlandığı iddia edilmir. Sınaq qeydləri yalnız bu tabda qalır. Şəxsi məlumat daxil etməyin.',
    'Daxil olmadan sintetik sınağa başlayın'],
};
const names = ['한국어','English','日本語','简体中文','繁體中文','Монгол','ไทย','Tiếng Việt','العربية','Русский','ខ្មែរ','Español','Français','Italiano','Azərbaycan'];
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const GUIDE_LOCALES = PROV_LOCALE_ORDER;
export function renderGuide(locale: string, base = '/') {
  const i = GUIDE_LOCALES.findIndex(l => l === locale);
  if (i < 0) throw new Error('Unsupported guide locale');
  const t = (k: keyof typeof PROV_RAW) => escape(PROV_RAW[k][i]);
  const [intro, flow, limit, start] = COPY[locale].map(escape);
  const prefix = base.replace(/\/?$/, '/');
  const cta = `${prefix}demo?lang=${locale}`;
  const examples = SYNTHETIC_SEEDS.slice(0, 2).map(raw => {
    const seed = localizeSeed(raw, locale);
    // Explicit allowlist: never spread the source object or serialize privateNote/IDs.
    return `<article><p class="tag">${t('pv.ct.'+seed.cardType as keyof typeof PROV_RAW)} · ${t('pv.nt.'+seed.nature as keyof typeof PROV_RAW)}</p><h2>${escape(seed.title)}</h2><p>${escape(seed.selectedJob)}</p><p>${escape(seed.input.selectedAction ?? '')}</p><p>${escape(seed.input.result ?? '')}</p><p>${escape(seed.input.learning ?? '')}</p></article>`;
  }).join('');
  return `<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NUVIA · ${t('pv.open')}</title><meta name="description" content="${intro}"><meta name="robots" content="index, follow"><meta property="og:title" content="NUVIA · ${t('pv.open')}"><meta property="og:description" content="${intro}"><meta property="og:type" content="website"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%2313223e'/%3E%3Ctext x='9' y='29' fill='white' font-size='28'%3EN%3C/text%3E%3C/svg%3E"><style>
*{box-sizing:border-box}body{margin:0;background:#f3f5f9;color:#192743;font:17px/1.8 system-ui,"Noto Sans Thai","Noto Sans Khmer",sans-serif;overflow-wrap:anywhere}header{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#13223e;color:white;padding:18px max(18px,calc((100% - 1080px)/2))}header strong{letter-spacing:.12em}details{position:relative;min-width:110px}summary{cursor:pointer;padding:8px 14px;min-height:44px;border:1px solid #8090a8;border-radius:8px}.languages{position:absolute;inset-inline-end:0;z-index:1;background:white;box-shadow:0 6px 24px #15264222;padding:10px;width:210px;max-height:60vh;overflow:auto;border-radius:8px}.languages a{display:block;min-height:44px;padding:8px 12px;color:#164ca0}main{max-width:1080px;margin:auto;padding:28px 18px 60px}h1{font-size:clamp(26px,4vw,40px);line-height:1.4}h2{font-size:22px;line-height:1.6}article,section{padding:24px;background:white;border:1px solid #dce2eb;border-radius:12px;margin:20px 0;box-shadow:0 2px 5px #10234406}.tag{color:#1755a2;font-weight:650}.cta{display:inline-block;background:#ae3900;color:white;text-decoration:none;padding:12px 20px;min-height:48px;border-radius:8px;font-weight:700;line-height:1.6}.notice{border-inline-start:4px solid #2365bf}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.grid article{margin:0}li{padding:5px}a:focus-visible,summary:focus-visible{outline:3px solid #fa9900;outline-offset:3px}@media(max-width:700px){.grid{grid-template-columns:1fr}article,section{padding:18px}header{padding:14px 18px}}
</style></head><body><header><strong>NUVIA</strong><details><summary>${names[i]}</summary><nav class="languages">${GUIDE_LOCALES.map((l,j)=>`<a lang="${l}" href="${prefix}demo-info/${l}.html"${l===locale?' aria-current="page"':''}>${names[j]}</a>`).join('')}</nav></details></header><main><h1>${t('pv.open')}</h1><p>${intro}</p><a class="cta" href="${cta}">${start}</a><section class="notice"><p>${limit}</p></section><section><ol>${flow.split(' → ').map(s=>`<li>${s}</li>`).join('')}</ol></section><div class="grid">${examples}</div><p><a class="cta" href="${cta}">${start}</a></p></main></body></html>`;
}

export function publicGuidePlugin(base: string): Plugin {
  return {
    name: 'public-synthetic-guide',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url ?? '/', 'http://localhost').pathname;
        const prefix = base.replace(/\/?$/, '/') + 'demo-info/';
        if (!path.startsWith(prefix)) return next();
        const slug = path.slice(prefix.length);
        const locale = slug === '' || slug === 'index.html' ? 'ko' : slug.replace(/\.html$/, '');
        if (!GUIDE_LOCALES.some(l => l === locale)) { res.statusCode=404;res.end('Not found');return; }
        res.setHeader('Content-Type','text/html; charset=utf-8');
        res.end(renderGuide(locale,base));
      });
    },
    generateBundle() {
      for (const locale of GUIDE_LOCALES)
        this.emitFile({type:'asset',fileName:`demo-info/${locale}.html`,source:renderGuide(locale,base)});
      this.emitFile({type:'asset',fileName:'demo-info/index.html',source:renderGuide('ko',base)});
    },
  };
}
