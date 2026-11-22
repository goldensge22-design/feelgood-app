import type { LocaleId } from './i18n';
const locales: LocaleId[] = ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const notes = [
  '미등록 입력은 이 브라우저에 임시 보관합니다. 계정 저장·제출·공유가 아닙니다.',
  'Unregistered input is kept temporarily in this browser, not saved to your account, submitted or shared.',
  '未登録の入力はこのブラウザに一時保管します。アカウント保存・提出・共有ではありません。',
  '未登记的输入暂存在此浏览器中，不代表已保存到账户、提交或分享。',
  '未登記的輸入暫存在此瀏覽器中，不代表已儲存至帳戶、提交或分享。',
  'Бүртгээгүй бичвэрийг энэ хөтөчид түр хадгална. Бүртгэлд хадгалах, илгээх, хуваалцах үйлдэл биш.',
  'ข้อมูลที่ยังไม่ลงทะเบียนจะเก็บชั่วคราวในเบราว์เซอร์นี้ ไม่ใช่การบันทึกในบัญชี ส่ง หรือแชร์',
  'Nội dung chưa đăng ký được giữ tạm trong trình duyệt này, chưa lưu vào tài khoản, gửi hay chia sẻ.',
  'يُحفظ الإدخال غير المسجّل مؤقتًا في هذا المتصفح، وليس في الحساب، ولا يُرسل أو يُشارك.',
  'Незарегистрированный ввод временно хранится в этом браузере, а не в аккаунте; он не отправлен и не опубликован.',
  'អត្ថបទមិនទាន់ចុះបញ្ជីត្រូវបានរក្សាទុកបណ្ដោះអាសន្នក្នុងកម្មវិធីរុករកនេះ មិនមែនរក្សាក្នុងគណនី ដាក់ស្នើ ឬចែករំលែកទេ។',
  'El texto sin registrar se guarda temporalmente en este navegador, no en tu cuenta; no se envía ni comparte.',
  'La saisie non enregistrée est conservée temporairement dans ce navigateur, pas dans le compte, ni envoyée ou partagée.',
  'Il testo non registrato resta temporaneamente in questo browser, non nell’account; non viene inviato né condiviso.',
  'Qeydiyyata alınmamış mətn bu brauzerdə müvəqqəti saxlanır; hesaba yazılmır, göndərilmir və paylaşılmır.',
];
const failed = [
  '임시 보관하지 못했습니다. 이동 전에 다시 시도하거나 입력을 복사해 주세요.',
  'Temporary storage failed. Retry or copy your input before leaving.',
  '一時保管できませんでした。移動前に再試行するか入力をコピーしてください。',
  '暂存失败。离开前请重试或复制输入内容。',
  '暫存失敗。離開前請重試或複製輸入內容。',
  'Түр хадгалж чадсангүй. Гарахаас өмнө дахин оролдох эсвэл бичвэрээ хуулна уу.',
  'เก็บชั่วคราวไม่สำเร็จ โปรดลองอีกครั้งหรือคัดลอกข้อความก่อนออก',
  'Không thể lưu tạm. Hãy thử lại hoặc sao chép nội dung trước khi rời đi.',
  'تعذّر الحفظ المؤقت. أعد المحاولة أو انسخ النص قبل المغادرة.',
  'Не удалось сохранить временно. Повторите попытку или скопируйте текст перед выходом.',
  'មិនអាចរក្សាទុកបណ្ដោះអាសន្នបានទេ។ សូមព្យាយាមម្ដងទៀត ឬចម្លងអត្ថបទមុនចាកចេញ។',
  'No se pudo guardar temporalmente. Reintenta o copia el texto antes de salir.',
  'Échec du stockage temporaire. Réessayez ou copiez le texte avant de quitter.',
  'Salvataggio temporaneo non riuscito. Riprova o copia il testo prima di uscire.',
  'Müvəqqəti saxlama alınmadı. Çıxmazdan əvvəl yenidən cəhd edin və ya mətni köçürün.',
];
const conflicts = [
  '다른 탭의 입력을 덮어쓰지 않았습니다. 현재 입력을 복사해 보관한 뒤 확인해 주세요.',
  'Another tab’s input was not overwritten. Copy your current input and review it.',
  '別タブの入力は上書きしていません。現在の入力をコピーして確認してください。',
  '未覆盖其他标签页的输入。请复制保留当前输入并核对。',
  '未覆寫其他分頁的輸入。請複製保留目前輸入並核對。',
  'Өөр табын бичвэрийг дараагүй. Одоогийн бичвэрээ хуулж хадгалаад шалгана уу.',
  'ไม่ได้เขียนทับข้อมูลในแท็บอื่น โปรดคัดลอกข้อความปัจจุบันเก็บไว้แล้วตรวจสอบ',
  'Không ghi đè nội dung ở thẻ khác. Hãy sao chép nội dung hiện tại và kiểm tra.',
  'لم تُستبدل كتابة علامة تبويب أخرى. انسخ إدخالك الحالي وراجعه.',
  'Ввод в другой вкладке не перезаписан. Скопируйте текущий текст и проверьте его.',
  'មិនបានសរសេរជាន់លើអត្ថបទក្នុងផ្ទាំងផ្សេងទេ។ សូមចម្លងទុកអត្ថបទបច្ចុប្បន្ន រួចពិនិត្យ។',
  'No se sobrescribió el texto de otra pestaña. Copia el texto actual y revísalo.',
  'Le texte d’un autre onglet n’a pas été écrasé. Copiez votre saisie actuelle et vérifiez-la.',
  'Il testo di un’altra scheda non è stato sovrascritto. Copia il testo attuale e controllalo.',
  'Başqa vərəqin mətni əvəz edilmədi. Cari mətni köçürüb saxlayın və yoxlayın.',
];
export function experienceDraftText(locale: LocaleId, key: 'note' | 'failed' | 'conflict') {
  const index = locales.indexOf(locale);
  return (key === 'note' ? notes : key === 'failed' ? failed : conflicts)[index < 0 ? 0 : index];
}
