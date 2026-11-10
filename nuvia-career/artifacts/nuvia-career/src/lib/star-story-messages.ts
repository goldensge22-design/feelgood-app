export const STAR_LOCALE_ORDER = [
  'ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'mn', 'th', 'vi', 'ar', 'ru', 'km', 'es', 'fr', 'it', 'az',
];

/** New STAR-only strings. Existing locale copy is intentionally not rewritten. */
export const STAR_RAW: Record<string, readonly string[]> = {
  'star.helpTitle': [
    '경험 정리 도움 (선택) · {title}', 'Experience reflection help (optional) · {title}', '経験の整理サポート（任意） · {title}', '经历整理帮助（可选）· {title}', '經驗整理協助（選填）· {title}',
    'Туршлагаа цэгцлэх тусламж (сонголттой) · {title}', 'ตัวช่วยเรียบเรียงประสบการณ์ (ไม่บังคับ) · {title}', 'Hỗ trợ sắp xếp trải nghiệm (tùy chọn) · {title}', 'مساعدة في ترتيب التجربة (اختياري) · {title}', 'Помощь в описании опыта (необязательно) · {title}',
    'ជំនួយរៀបចំបទពិសោធន៍ (ជាជម្រើស) · {title}', 'Ayuda para ordenar la experiencia (opcional) · {title}', 'Aide à structurer l’expérience (facultatif) · {title}', 'Aiuto per organizzare l’esperienza (facoltativo) · {title}', 'Təcrübəni qurmaq üçün kömək (istəyə bağlı) · {title}',
  ],
  'star.archiveTitle': [
    '경험 상황·역할 보충 (선택)', 'Add experience context and role (optional)', '経験の状況・役割を補足（任意）', '补充经历情境与角色（可选）', '補充經驗情境與角色（選填）',
    'Туршлагын нөхцөл, үүргийг нэмэх (сонголттой)', 'เพิ่มบริบทและบทบาทของประสบการณ์ (ไม่บังคับ)', 'Bổ sung tình huống và vai trò (tùy chọn)', 'إضافة سياق التجربة والدور (اختياري)', 'Дополнить ситуацию и роль (необязательно)',
    'បន្ថែមបរិបទ និងតួនាទីបទពិសោធន៍ (ជាជម្រើស)', 'Añadir contexto y papel de la experiencia (opcional)', 'Ajouter le contexte et le rôle (facultatif)', 'Aggiungi contesto e ruolo (facoltativo)', 'Təcrübənin vəziyyətini və rolunu əlavə et (istəyə bağlı)',
  ],
  'star.archiveNote': [
    '없는 내용을 만들 필요 없이 아는 만큼 적으세요. 추가 항목은 이 기기의 보조 기록에만 저장되며 계정 서버·플래너·자소서 본문·내보내기에 자동 전송되지 않습니다.',
    'Write only what you know; do not invent details. These additional notes stay on this device and are not sent to an account server, planner, essay, or export.',
    '事実にない内容を作らず、分かる範囲で書いてください。追加項目はこの端末の補助記録にのみ保存され、アカウントサーバー・プランナー・本文・書き出しには自動送信されません。',
    '只填写你确定的内容，不要编造。补充项目仅保存在本设备的辅助记录中，不会自动发送到账户服务器、计划工具、正文或导出文件。',
    '只填寫你確定的內容，不要編造。補充項目僅保存在本裝置的輔助記錄中，不會自動傳送至帳戶伺服器、規劃工具、正文或匯出檔案。',
    'Мэдэж буй зүйлээ л бичиж, байхгүй зүйлийг бүү зохио. Нэмэлт зүйлс зөвхөн энэ төхөөрөмжийн туслах тэмдэглэлд хадгалагдаж, бүртгэлийн сервер, төлөвлөгч, бичвэр эсвэл экспортод автоматаар илгээгдэхгүй.',
    'เขียนเท่าที่ทราบ ไม่ต้องแต่งเติม ข้อมูลเพิ่มเติมจะอยู่ในบันทึกเสริมของอุปกรณ์นี้เท่านั้น และไม่ส่งไปยังเซิร์ฟเวอร์บัญชี แพลนเนอร์ เนื้อหาเรียงความ หรือไฟล์ส่งออกโดยอัตโนมัติ',
    'Chỉ ghi điều bạn biết, không bịa thêm. Các mục bổ sung chỉ lưu trong ghi chú trên thiết bị này; không tự gửi đến máy chủ tài khoản, planner, bài viết hay tệp xuất.',
    'اكتب ما تعرفه فقط دون اختلاق تفاصيل. تُحفظ الإضافات على هذا الجهاز فقط، ولا تُرسل تلقائيًا إلى خادم الحساب أو المخطِّط أو نصك أو ملفات التصدير.',
    'Записывайте только то, что знаете, не придумывая деталей. Дополнения хранятся только на этом устройстве и не отправляются автоматически на сервер аккаунта, в планер, текст или экспорт.',
    'សរសេរតែអ្វីដែលអ្នកដឹង ដោយមិនបង្កើតព័ត៌មាន។ ចំណុចបន្ថែមរក្សាទុកតែលើឧបករណ៍នេះ ហើយមិនផ្ញើទៅម៉ាស៊ីនមេគណនី ផែនការ អត្ថបទ ឬឯកសារនាំចេញដោយស្វ័យប្រវត្តិទេ។',
    'Escribe solo lo que sabes, sin inventar datos. Los campos adicionales se guardan solo en este dispositivo y no se envían automáticamente al servidor, al planificador, al texto ni a las exportaciones.',
    'Notez uniquement ce que vous savez, sans rien inventer. Les ajouts restent sur cet appareil et ne sont pas envoyés automatiquement au serveur, au planificateur, au texte ni aux exports.',
    'Scrivi solo ciò che sai, senza inventare dettagli. Le aggiunte restano su questo dispositivo e non vengono inviate automaticamente al server, al planner, al testo o agli esporti.',
    'Yalnız bildiklərinizi yazın, əlavə məlumat uydurmayın. Əlavələr yalnız bu cihazda saxlanır və hesab serverinə, planlayıcıya, mətnə və ya ixraca avtomatik göndərilmir.',
  ],
  'star.archiveSaveError': [
    '기기 저장에 실패했습니다. 입력을 유지했으니 다시 저장해 주세요.', 'Could not save on this device. Your input is still here; try saving again.', '端末に保存できませんでした。入力は残っています。もう一度保存してください。', '无法保存到本设备。输入内容仍在，请重新保存。', '無法儲存至本裝置。輸入內容仍保留，請重新儲存。',
    'Төхөөрөмжид хадгалж чадсангүй. Оруулсан зүйл хэвээр байна. Дахин хадгална уу.', 'บันทึกในอุปกรณ์ไม่สำเร็จ ข้อมูลยังอยู่ โปรดลองบันทึกอีกครั้ง', 'Không lưu được trên thiết bị này. Nội dung vẫn còn; hãy lưu lại.', 'تعذّر الحفظ على هذا الجهاز. ما كتبته ما زال هنا؛ أعد الحفظ.', 'Не удалось сохранить на устройстве. Ввод сохранён; попробуйте сохранить ещё раз.',
    'មិនអាចរក្សាទុកលើឧបករណ៍នេះបានទេ។ អ្វីដែលបានបញ្ចូលនៅដដែល សូមរក្សាទុកម្តងទៀត។', 'No se pudo guardar en este dispositivo. El texto sigue aquí; vuelve a guardarlo.', 'Échec de l’enregistrement sur cet appareil. Votre saisie est conservée ; enregistrez à nouveau.', 'Impossibile salvare su questo dispositivo. Il testo è ancora presente; salva di nuovo.', 'Bu cihazda saxlamaq mümkün olmadı. Daxil etdikləriniz qalır; yenidən saxlayın.',
  ],
  'star.helpIntro': [
    '필요한 항목만 내 말로 정리하세요. AI는 본문을 분석·재작성하거나 사실을 확인하지 않습니다. 상황·역할·선택 이유·확인 근거는 이 기기의 보조 기록에만 저장되며 본문·내보내기에 자동 추가되지 않습니다. 행동·결과·배움은 기존 경험 저장 흐름을 사용합니다.',
    'Write only what you need, in your own words. AI does not analyze or rewrite your essay or verify facts. Situation, role, reasons, and evidence are saved only as notes on this device; they are not added to your essay or exports. Actions, results, and learning use the existing experience record.',
    '必要な項目だけを自分の言葉で整理してください。AIが本文を分析・書き換えたり、事実を確認したりすることはありません。状況・役割・選択理由・確認根拠はこの端末の補助メモにのみ保存され、本文や書き出しに自動追加されません。行動・結果・学びは既存の経験記録に保存されます。',
    '只用自己的话整理需要的内容。AI 不会分析或改写正文，也不会核实事实。情境、角色、选择理由和核对依据只保存在本设备的辅助记录中，不会自动加入正文或导出文件。行动、结果和收获沿用现有经历记录。',
    '只用自己的話整理需要的內容。AI 不會分析或改寫正文，也不會核實事實。情境、角色、選擇理由和查證依據只保存在本裝置的輔助記錄中，不會自動加入正文或匯出檔案。行動、結果和收穫沿用現有經驗記錄。',
    'Зөвхөн хэрэгтэй зүйлээ өөрийн үгээр бичээрэй. AI таны бичвэрийг шинжлэх, дахин найруулах эсвэл баримтыг шалгахгүй. Нөхцөл, үүрэг, сонгосон шалтгаан, нотолгоо зөвхөн энэ төхөөрөмжийн туслах тэмдэглэлд хадгалагдаж, бичвэр эсвэл экспортод автоматаар нэмэгдэхгүй. Үйлдэл, үр дүн, сургамж одоогийн туршлагын бүртгэлд хадгалагдана.',
    'เขียนเฉพาะส่วนที่ต้องการด้วยคำของคุณเอง AI จะไม่วิเคราะห์หรือเขียนเนื้อหาใหม่ และไม่ตรวจสอบข้อเท็จจริง สถานการณ์ บทบาท เหตุผล และหลักฐานจะบันทึกเป็นข้อมูลเสริมในอุปกรณ์นี้เท่านั้น และไม่เพิ่มลงในเนื้อหาหรือไฟล์ส่งออกโดยอัตโนมัติ การกระทำ ผลลัพธ์ และสิ่งที่เรียนรู้ใช้การบันทึกประสบการณ์เดิม',
    'Chỉ ghi những mục cần thiết bằng lời của bạn. AI không phân tích, viết lại bài hay xác minh sự thật. Tình huống, vai trò, lý do và căn cứ chỉ lưu dưới dạng ghi chú bổ sung trên thiết bị này; không tự thêm vào bài hoặc tệp xuất. Hành động, kết quả và điều học được vẫn dùng bản ghi trải nghiệm hiện có.',
    'اكتب ما تحتاج إليه فقط بكلماتك. لا يحلل الذكاء الاصطناعي نصك أو يعيد صياغته ولا يتحقق من الوقائع. تُحفظ الحالة والدور والأسباب والأدلة كملاحظات إضافية على هذا الجهاز فقط، ولا تُضاف تلقائيًا إلى النص أو الملفات المصدّرة. وتُحفظ الأفعال والنتائج والتعلّم ضمن سجل التجربة الحالي.',
    'Заполняйте только нужные пункты своими словами. ИИ не анализирует и не переписывает текст и не проверяет факты. Ситуация, роль, причины и подтверждения хранятся только в дополнительных заметках на этом устройстве и не добавляются автоматически в текст или экспорт. Действия, результаты и выводы сохраняются в существующей записи опыта.',
    'សរសេរតែចំណុចដែលត្រូវការដោយពាក្យរបស់អ្នក។ AI មិនវិភាគ ឬសរសេរអត្ថបទឡើងវិញ ហើយមិនផ្ទៀងផ្ទាត់ការពិតទេ។ ស្ថានភាព តួនាទី មូលហេតុ និងភស្តុតាងត្រូវរក្សាទុកជាកំណត់ត្រាបន្ថែមលើឧបករណ៍នេះប៉ុណ្ណោះ ហើយមិនបន្ថែមទៅក្នុងអត្ថបទ ឬឯកសារនាំចេញដោយស្វ័យប្រវត្តិទេ។ សកម្មភាព លទ្ធផល និងអ្វីដែលបានរៀនប្រើកំណត់ត្រាបទពិសោធន៍ដែលមានស្រាប់។',
    'Escribe solo lo que necesites con tus propias palabras. La IA no analiza ni reescribe el texto y tampoco verifica hechos. La situación, el rol, los motivos y las pruebas se guardan solo como notas en este dispositivo; no se añaden automáticamente al texto ni a las exportaciones. Las acciones, resultados y aprendizajes usan el registro de experiencia existente.',
    'Notez uniquement ce dont vous avez besoin, avec vos mots. L’IA n’analyse ni ne réécrit le texte et ne vérifie pas les faits. La situation, le rôle, les raisons et les éléments de preuve sont enregistrés uniquement comme notes sur cet appareil ; ils ne sont pas ajoutés automatiquement au texte ni aux exports. Actions, résultats et apprentissages restent dans l’expérience existante.',
    'Scrivi solo ciò che ti serve con parole tue. L’IA non analizza né riscrive il testo e non verifica i fatti. Situazione, ruolo, motivi e prove sono salvati solo come note aggiuntive su questo dispositivo; non vengono inseriti automaticamente nel testo o negli esporti. Azioni, risultati e apprendimenti usano la registrazione dell’esperienza esistente.',
    'Yalnız lazım olan hissələri öz sözlərinizlə yazın. Süni intellekt mətni təhlil və ya yenidən yazmır, faktları da yoxlamır. Vəziyyət, rol, səbəblər və sübutlar yalnız bu cihazda əlavə qeydlər kimi saxlanır; mətnə və ixraca avtomatik əlavə edilmir. Hərəkətlər, nəticələr və öyrənilənlər mövcud təcrübə qeydinə yazılır.',
  ],
  'star.saveButton': [
    '이 기기에 정리 내용 저장', 'Save notes on this device', 'この端末に整理内容を保存', '将整理内容保存到本设备', '將整理內容儲存至本裝置',
    'Цэгцэлсэн тэмдэглэлийг энэ төхөөрөмжид хадгалах', 'บันทึกบันทึกช่วยจำในอุปกรณ์นี้', 'Lưu ghi chú trên thiết bị này', 'حفظ الملاحظات على هذا الجهاز', 'Сохранить заметки на этом устройстве',
    'រក្សាទុកកំណត់ត្រាលើឧបករណ៍នេះ', 'Guardar notas en este dispositivo', 'Enregistrer les notes sur cet appareil', 'Salva le note su questo dispositivo', 'Qeydləri bu cihazda saxla',
  ],
  'star.savedStatus': [
    '보조 기록을 이 기기에 저장했습니다. 자소서 본문은 바꾸지 않았습니다.', 'Notes saved on this device. Your essay was not changed.', '補助メモをこの端末に保存しました。本文は変更していません。', '辅助记录已保存到本设备。自我介绍正文未更改。', '輔助記錄已儲存至本裝置。自傳正文未變更。',
    'Туслах тэмдэглэлийг энэ төхөөрөмжид хадгаллаа. Үндсэн бичвэр өөрчлөгдөөгүй.', 'บันทึกข้อมูลเสริมในอุปกรณ์นี้แล้ว เนื้อหาเรียงความไม่เปลี่ยน', 'Đã lưu ghi chú trên thiết bị này. Bài viết không bị thay đổi.', 'حُفظت الملاحظات على هذا الجهاز. لم يتغير نصك.', 'Заметки сохранены на этом устройстве. Текст эссе не изменён.',
    'បានរក្សាទុកកំណត់ត្រាបន្ថែមលើឧបករណ៍នេះ។ អត្ថបទរបស់អ្នកមិនបានផ្លាស់ប្តូរទេ។', 'Notas guardadas en este dispositivo. El texto no se modificó.', 'Notes enregistrées sur cet appareil. Votre texte n’a pas été modifié.', 'Note salvate su questo dispositivo. Il testo non è stato modificato.', 'Əlavə qeydlər bu cihazda saxlanıldı. Mətniniz dəyişdirilmədi.',
  ],
  'star.saveError': [
    '기기 저장에 실패했습니다. 입력을 유지했으니 다시 시도하세요.', 'Could not save on this device. Your input is still here; try again.', '端末に保存できませんでした。入力は残っています。もう一度お試しください。', '无法保存到本设备。输入内容仍在，请重试。', '無法儲存至本裝置。輸入內容仍保留，請再試一次。',
    'Төхөөрөмжид хадгалж чадсангүй. Оруулсан зүйл хэвээр байна. Дахин оролдоно уу.', 'บันทึกในอุปกรณ์ไม่สำเร็จ ข้อมูลยังอยู่ โปรดลองอีกครั้ง', 'Không lưu được trên thiết bị này. Nội dung vẫn còn; hãy thử lại.', 'تعذّر الحفظ على هذا الجهاز. ما كتبته ما زال هنا؛ حاول مرة أخرى.', 'Не удалось сохранить на устройстве. Ввод сохранён; попробуйте ещё раз.',
    'មិនអាចរក្សាទុកលើឧបករណ៍នេះបានទេ។ អ្វីដែលបានបញ្ចូលនៅដដែល សូមព្យាយាមម្តងទៀត។', 'No se pudo guardar en este dispositivo. El texto sigue aquí; inténtalo de nuevo.', 'Échec de l’enregistrement sur cet appareil. Votre saisie est conservée ; réessayez.', 'Impossibile salvare su questo dispositivo. Il testo è ancora presente; riprova.', 'Bu cihazda saxlamaq mümkün olmadı. Daxil etdikləriniz qalır; yenidən cəhd edin.',
  ],
  'star.detailTitle': [
    '경험 정리 보충 (선택)', 'Experience notes (optional)', '経験の補足（任意）', '经历补充（可选）', '經驗補充（選填）', 'Туршлагын нэмэлт тэмдэглэл (сонголттой)', 'บันทึกประสบการณ์เพิ่มเติม (ไม่บังคับ)', 'Ghi chú bổ sung về trải nghiệm (tùy chọn)', 'ملاحظات إضافية عن التجربة (اختياري)', 'Дополнение к описанию опыта (необязательно)',
    'កំណត់ត្រាបទពិសោធន៍បន្ថែម (ជាជម្រើស)', 'Notas adicionales de experiencia (opcional)', 'Notes complémentaires sur l’expérience (facultatif)', 'Note aggiuntive sull’esperienza (facoltative)', 'Təcrübə haqqında əlavə qeydlər (istəyə bağlı)',
  ],
  'star.deviceNote': [
    '추가 STAR 항목은 이 기기의 보조 기록입니다.', 'Additional STAR notes stay on this device.', '追加のSTAR項目はこの端末の補助メモです。', '额外的STAR内容仅保存在本设备的辅助记录中。', '額外的STAR內容僅保存在本裝置的輔助記錄中。',
    'Нэмэлт STAR тэмдэглэл энэ төхөөрөмжид хадгалагдана.', 'บันทึก STAR เพิ่มเติมอยู่ในอุปกรณ์นี้เท่านั้น', 'Các ghi chú STAR bổ sung chỉ lưu trên thiết bị này.', 'تظل ملاحظات STAR الإضافية على هذا الجهاز.', 'Дополнительные заметки STAR хранятся только на этом устройстве.',
    'កំណត់ត្រា STAR បន្ថែមរក្សាទុកតែលើឧបករណ៍នេះ។', 'Las notas STAR adicionales permanecen en este dispositivo.', 'Les notes STAR supplémentaires restent sur cet appareil.', 'Le note STAR aggiuntive restano su questo dispositivo.', 'Əlavə STAR qeydləri yalnız bu cihazda qalır.',
  ],
  'star.field.situation': [
    '당시 상황 (S)', 'Situation (S)', '当時の状況（S）', '当时情境（S）', '當時情境（S）', 'Тухайн үеийн нөхцөл байдал (S)', 'สถานการณ์ในขณะนั้น (S)', 'Tình huống lúc đó (S)', 'الموقف حينها (S)', 'Ситуация (S)', 'ស្ថានភាពនៅពេលនោះ (S)', 'Situación (S)', 'Situation (S)', 'Situazione (S)', 'Həmin vaxtkı vəziyyət (S)',
  ],
  'star.field.situationHint': [
    '무슨 일이 있었는지 내 말로 적습니다.', 'Describe what happened in your own words.', '何があったのかを自分の言葉で書きます。', '用自己的话描述当时发生了什么。', '用自己的話描述當時發生了什麼。', 'Юу болсон талаар өөрийн үгээр бичнэ үү.', 'เขียนด้วยคำของคุณเองว่าเกิดอะไรขึ้น', 'Dùng lời của bạn mô tả điều đã xảy ra.', 'اكتب ما حدث بكلماتك.', 'Опишите своими словами, что произошло.', 'សរសេរអ្វីដែលបានកើតឡើងដោយពាក្យរបស់អ្នក។', 'Describe con tus propias palabras qué ocurrió.', 'Décrivez avec vos mots ce qui s’est passé.', 'Descrivi con parole tue che cosa è successo.', 'Nə baş verdiyini öz sözlərinizlə yazın.',
  ],
  'star.field.roleGoal': [
    '내 역할과 해결 목표 (T)', 'My role and goal (T)', '自分の役割と目標（T）', '我的角色与目标（T）', '我的角色與目標（T）', 'Миний үүрэг ба зорилго (T)', 'บทบาทและเป้าหมายของฉัน (T)', 'Vai trò và mục tiêu của tôi (T)', 'دوري وهدفي (T)', 'Моя роль и цель (T)', 'តួនាទី និងគោលដៅរបស់ខ្ញុំ (T)', 'Mi papel y objetivo (T)', 'Mon rôle et mon objectif (T)', 'Il mio ruolo e obiettivo (T)', 'Mənim rolum və məqsədim (T)',
  ],
  'star.field.roleGoalHint': [
    '내가 맡은 역할과 해결하려던 목표를 적습니다.', 'Describe your role and what you were trying to address.', '自分が担った役割と解決しようとした目標を書きます。', '写下自己承担的角色和想要解决的问题。', '寫下自己承擔的角色和想要解決的問題。', 'Өөрийн хүлээсэн үүрэг болон шийдэхийг зорьсон зүйлээ бичнэ үү.', 'เขียนบทบาทที่คุณรับผิดชอบและเป้าหมายที่ต้องการแก้ไข', 'Ghi vai trò bạn đảm nhận và điều bạn muốn giải quyết.', 'اكتب الدور الذي توليته والهدف الذي سعيت إلى تحقيقه.', 'Опишите свою роль и задачу, которую вы пытались решить.', 'សរសេរតួនាទីដែលអ្នកទទួលខុសត្រូវ និងគោលដៅដែលអ្នកចង់ដោះស្រាយ។', 'Anota el papel que asumiste y lo que intentabas resolver.', 'Indiquez le rôle assumé et ce que vous cherchiez à résoudre.', 'Indica il ruolo che hai assunto e cosa cercavi di risolvere.', 'Üzərinizə götürdüyünüz rolu və həll etməyə çalışdığınız məqsədi yazın.',
  ],
  'star.field.selectionReason': [
    '행동을 선택한 이유', 'Why I chose this action', '行動を選んだ理由', '选择该行动的原因', '選擇該行動的原因', 'Үйлдлийг сонгосон шалтгаан', 'เหตุผลที่เลือกการกระทำนี้', 'Lý do chọn hành động này', 'سبب اختيار هذا الإجراء', 'Почему я выбрал это действие', 'មូលហេតុដែលជ្រើសរើសសកម្មភាពនេះ', 'Por qué elegí esta acción', 'Pourquoi j’ai choisi cette action', 'Perché ho scelto questa azione', 'Bu addımı seçmə səbəbim',
  ],
  'star.field.selectionReasonHint': [
    '무엇을 보고 왜 그렇게 정했는지 적습니다.', 'Explain what you noticed and why you decided to act that way.', '何に気づき、なぜその行動を選んだのかを書きます。', '写下你注意到了什么，以及为何作出这个选择。', '寫下你注意到什麼，以及為何作出這個選擇。', 'Юуг анзаарч, яагаад тэгж шийдсэнээ бичнэ үү.', 'เขียนว่าคุณสังเกตอะไรและเหตุใดจึงตัดสินใจเช่นนั้น', 'Ghi điều bạn nhận thấy và lý do bạn chọn cách đó.', 'اكتب ما الذي لاحظته ولماذا قررت التصرف بهذه الطريقة.', 'Опишите, что вы заметили и почему решили поступить именно так.', 'សរសេរអ្វីដែលអ្នកបានសង្កេត និងហេតុអ្វីបានជាសម្រេចចិត្តបែបនោះ។', 'Explica qué observaste y por qué decidiste actuar así.', 'Expliquez ce que vous avez remarqué et pourquoi vous avez choisi cette action.', 'Spiega cosa hai notato e perché hai deciso di agire così.', 'Nə müşahidə etdiyinizi və niyə belə qərar verdiyinizi yazın.',
  ],
  'star.field.resultEvidence': [
    '결과 확인 근거', 'Evidence for the result', '結果を確認した根拠', '确认结果的依据', '確認結果的依據', 'Үр дүнг баталгаажуулсан нотолгоо', 'หลักฐานที่ใช้ตรวจสอบผลลัพธ์', 'Căn cứ xác nhận kết quả', 'دليل التحقق من النتيجة', 'Чем подтверждён результат', 'ភស្តុតាងផ្ទៀងផ្ទាត់លទ្ធផល', 'Pruebas para confirmar el resultado', 'Éléments permettant de vérifier le résultat', 'Prove usate per verificare il risultato', 'Nəticəni təsdiqləyən sübut',
  ],
  'star.field.resultEvidenceHint': [
    '어떤 자료나 관찰로 결과를 확인했는지 적습니다.', 'Describe what information or observation helped you confirm the result.', 'どの資料や観察で結果を確認したのかを書きます。', '写下你通过哪些资料或观察确认了结果。', '寫下你透過哪些資料或觀察確認了結果。', 'Ямар мэдээлэл эсвэл ажиглалтаар үр дүнг баталгаажуулснаа бичнэ үү.', 'เขียนว่าคุณใช้ข้อมูลหรือการสังเกตใดยืนยันผลลัพธ์', 'Ghi tài liệu hoặc quan sát giúp bạn xác nhận kết quả.', 'اكتب المعلومات أو الملاحظة التي استخدمتها للتحقق من النتيجة.', 'Опишите данные или наблюдения, которыми вы подтвердили результат.', 'សរសេរព័ត៌មាន ឬការសង្កេតដែលអ្នកប្រើដើម្បីបញ្ជាក់លទ្ធផល។', 'Describe qué información u observación te permitió confirmar el resultado.', 'Indiquez les informations ou observations qui vous ont permis de vérifier le résultat.', 'Descrivi quali informazioni o osservazioni ti hanno permesso di verificare il risultato.', 'Nəticəni hansı məlumat və ya müşahidə ilə təsdiqlədiyinizi yazın.',
  ],
  'star.coachNote': [
    '연결 경험의 빈 항목을 기준으로 고른 정해진 질문입니다. AI가 본문을 분석하거나 사실·능력을 판정하지 않습니다.', 'A preset question is chosen from details missing in the linked experience. AI does not analyze your essay or judge facts or ability.', '関連する経験の未記入項目に応じた定型質問です。AIが本文を分析したり、事実や能力を判定したりすることはありません。', '问题根据关联经历中未填写的项目从固定问题中选择。AI不会分析正文，也不会判断事实或能力。', '問題依關聯經驗中未填寫的項目從固定問題中選擇。AI不會分析正文，也不會判斷事實或能力。',
    'Холбосон туршлагын дутуу хэсэгт тохирсон бэлэн асуулт юм. AI бичвэрийг шинжлэхгүй, баримт эсвэл чадварыг дүгнэхгүй.', 'เลือกคำถามที่กำหนดไว้ตามหัวข้อที่ยังขาดในประสบการณ์ที่เชื่อมโยง AI ไม่วิเคราะห์เนื้อหาหรือตัดสินข้อเท็จจริงหรือความสามารถ', 'Câu hỏi có sẵn được chọn theo mục còn thiếu trong trải nghiệm đã liên kết. AI không phân tích bài viết hay đánh giá sự thật hoặc năng lực.', 'هذا سؤال محدد مسبقًا اختير وفق التفاصيل الناقصة في التجربة المرتبطة. لا يحلل الذكاء الاصطناعي نصك ولا يحكم على الوقائع أو القدرة.', 'Это готовый вопрос о недостающих сведениях в связанном опыте. ИИ не анализирует текст и не оценивает факты или способности.',
    'សំណួរដែលបានកំណត់ជាមុន ត្រូវបានជ្រើសតាមផ្នែកដែលខ្វះក្នុងបទពិសោធន៍ភ្ជាប់។ AI មិនវិភាគអត្ថបទ ឬវិនិច្ឆ័យការពិត ឬសមត្ថភាពទេ។', 'Se elige una pregunta predefinida según los datos que faltan en la experiencia vinculada. La IA no analiza el texto ni juzga hechos o capacidades.', 'Une question prédéfinie est choisie selon les éléments manquants de l’expérience liée. L’IA n’analyse pas le texte et ne juge ni les faits ni les capacités.', 'Una domanda predefinita viene scelta in base ai dettagli mancanti nell’esperienza collegata. L’IA non analizza il testo né giudica fatti o capacità.', 'Əlaqəli təcrübədə çatışmayan hissəyə uyğun hazır sual seçilir. Süni intellekt mətni təhlil etmir, fakt və ya bacarığı qiymətləndirmir.',
  ],
  'star.coachNoScore': [
    '질문에 점수나 완료 판정은 없습니다.', 'Questions do not assign a score or mark the experience complete.', '質問に点数や完了判定はありません。', '问题不会评分，也不会判定完成。', '問題不會評分，也不會判定完成。',
    'Асуулт оноо өгөхгүй, дууссан гэж тэмдэглэхгүй.', 'คำถามไม่มีคะแนนหรือการตัดสินว่าเสร็จสมบูรณ์', 'Câu hỏi không chấm điểm hay đánh dấu hoàn tất.', 'لا تمنح الأسئلة درجة ولا تحكم باكتمال التجربة.', 'Вопросы не дают баллов и не отмечают опыт завершённым.',
    'សំណួរមិនផ្តល់ពិន្ទុ ឬសម្គាល់ថាបានបញ្ចប់ទេ។', 'Las preguntas no asignan puntuación ni marcan la experiencia como completa.', 'Les questions ne donnent aucune note et ne marquent pas l’expérience comme terminée.', 'Le domande non assegnano punteggi e non segnano l’esperienza come completa.', 'Suallar bal vermir və təcrübəni tamamlanmış saymır.',
  ],
  'star.coachToggleNote': [
    '지원동기·가치관·계획 중심 문항은 기존 코치 질문을 유지합니다. STAR 질문은 원할 때만 선택하세요.', 'For motivation, values, and plans, the existing coach stays in use. Choose STAR questions only if you want them.', '志望動機・価値観・計画が中心の設問では、従来のコーチ質問を維持します。STAR質問は必要な場合のみ選択してください。', '以求职动机、价值观或计划为主的问题仍使用原有教练问题。需要时再选择STAR问题。', '以求職動機、價值觀或計畫為主的問題仍使用原有教練問題。需要時再選擇STAR問題。',
    'Сэдэл, үнэт зүйл, төлөвлөгөөний асуултад одоогийн дасгалжуулагчийн асуултыг хэвээр хэрэглэнэ. Хүсвэл STAR асуултыг сонгоно уу.', 'คำถามเรื่องแรงจูงใจ ค่านิยม และแผนยังใช้คำถามโค้ชเดิม เลือกคำถาม STAR เมื่อคุณต้องการเท่านั้น', 'Với câu hỏi về động lực, giá trị và kế hoạch, bộ câu hỏi cũ vẫn được dùng. Chỉ chọn câu hỏi STAR nếu bạn muốn.', 'في أسئلة الدافع والقيم والخطط، تظل أسئلة المساعد الحالية. اختر أسئلة STAR عند الحاجة فقط.', 'Для вопросов о мотивации, ценностях и планах сохраняются прежние вопросы. Выбирайте STAR, только если хотите.',
    'សំណួរអំពីមូលហេតុ តម្លៃ និងផែនការនៅតែប្រើសំណួរគ្រូបង្វឹកដើម។ ជ្រើសសំណួរ STAR តែពេលអ្នកចង់ប្រើប៉ុណ្ណោះ។', 'En preguntas sobre motivación, valores y planes se mantienen las preguntas actuales. Elige STAR solo si lo deseas.', 'Pour les questions de motivation, de valeurs et de projets, les questions actuelles restent utilisées. Choisissez STAR seulement si vous le souhaitez.', 'Per domande su motivazione, valori e piani restano le domande attuali. Scegli STAR solo se lo desideri.', 'Motivasiya, dəyərlər və planlarla bağlı suallarda mövcud kouç sualları qalır. STAR suallarını yalnız istədikdə seçin.',
  ],
  'star.coachUseStar': [
    'STAR 질문 사용', 'Use STAR questions', 'STARの質問を使う', '使用STAR问题', '使用STAR問題', 'STAR асуулт ашиглах', 'ใช้คำถาม STAR', 'Dùng câu hỏi STAR', 'استخدم أسئلة STAR', 'Использовать вопросы STAR',
    'ប្រើសំណួរ STAR', 'Usar preguntas STAR', 'Utiliser les questions STAR', 'Usa le domande STAR', 'STAR suallarından istifadə et',
  ],
  'star.coachUseExisting': [
    '기존 코치 질문 사용', 'Use existing coach questions', '従来のコーチ質問を使う', '使用原有教练问题', '使用原有教練問題', 'Одоогийн дасгалжуулагчийн асуултыг ашиглах', 'ใช้คำถามโค้ชเดิม', 'Dùng câu hỏi hiện có', 'استخدم أسئلة المساعد الحالية', 'Использовать прежние вопросы',
    'ប្រើសំណួរគ្រូបង្វឹកដើម', 'Usar preguntas actuales', 'Utiliser les questions actuelles', 'Usa le domande attuali', 'Mövcud kouç suallarından istifadə et',
  ],
  'star.coach.situationActual': [
    '당시 어떤 상황이나 불편이 있었나요?', 'What was happening, or what felt inconvenient at the time?', 'そのとき、どのような状況や不便がありましたか？', '当时发生了什么，或有什么不便？', '當時發生了什麼，或有什麼不便？',
    'Тухайн үед ямар нөхцөл байдал, хүндрэл байсан бэ?', 'ตอนนั้นเกิดสถานการณ์หรือความไม่สะดวกอะไรขึ้น?', 'Khi đó đã có tình huống hay bất tiện gì?', 'ما الحالة أو الصعوبة التي واجهتها حينها؟', 'Что происходило или что было неудобно в тот момент?',
    'ពេលនោះមានស្ថានភាព ឬភាពមិនងាយស្រួលអ្វីខ្លះ?', '¿Qué situación o inconveniente había en ese momento?', 'Quelle situation ou difficulté rencontriez-vous alors ?', 'Quale situazione o difficoltà c’era in quel momento?', 'O vaxt hansı vəziyyət və ya çətinlik var idi?',
  ],
  'star.coach.situationSimulation': [
    '모의 상황에서 어떤 과제가 주어졌나요?', 'What task were you given in the simulated situation?', '模擬の状況では、どのような課題が与えられましたか？', '在模拟情境中，你接到的任务是什么？', '在模擬情境中，你接到的任務是什麼？',
    'Дуураймал нөхцөлд танд ямар даалгавар өгсөн бэ?', 'ในสถานการณ์จำลอง คุณได้รับโจทย์อะไร?', 'Trong tình huống mô phỏng, bạn được giao nhiệm vụ gì?', 'ما المهمة التي أُعطيت لك في الموقف المحاكى؟', 'Какое задание вам дали в смоделированной ситуации?',
    'ក្នុងស្ថានភាពសាកល្បង អ្នកទទួលបានភារកិច្ចអ្វី?', '¿Qué tarea te dieron en la situación simulada?', 'Quelle tâche vous a-t-on confiée dans la situation simulée ?', 'Quale compito ti è stato assegnato nella situazione simulata?', 'Simulyasiya vəziyyətində sizə hansı tapşırıq verildi?',
  ],
  'star.coach.situationUnknown': [
    '이 경험은 어떤 상황에서 이루어졌나요?', 'In what situation did this experience take place?', 'この経験はどのような状況で起きましたか？', '这段经历是在什么情况下发生的？', '這段經驗是在什麼情況下發生的？',
    'Энэ туршлага ямар нөхцөлд болсон бэ?', 'ประสบการณ์นี้เกิดขึ้นในสถานการณ์ใด?', 'Trải nghiệm này diễn ra trong tình huống nào?', 'في أي موقف حدثت هذه التجربة؟', 'В какой ситуации произошёл этот опыт?',
    'បទពិសោធន៍នេះកើតឡើងក្នុងស្ថានភាពណា?', '¿En qué situación tuvo lugar esta experiencia?', 'Dans quelle situation cette expérience a-t-elle eu lieu ?', 'In quale situazione è avvenuta questa esperienza?', 'Bu təcrübə hansı vəziyyətdə baş verdi?',
  ],
  'star.coach.roleGoal': [
    '그때 본인이 맡은 역할과 해결하려던 목표는 무엇이었나요?', 'What role did you take, and what were you trying to address?', 'そのときの役割と、解決しようとしていた目標は何でしたか？', '当时你承担了什么角色，想要解决什么问题？', '當時你承擔了什麼角色，想要解決什麼問題？',
    'Тухайн үед таны үүрэг юу байсан, юуг шийдэхийг зорьсон бэ?', 'ตอนนั้นคุณรับบทบาทอะไร และตั้งใจแก้ปัญหาอะไร?', 'Khi đó bạn đảm nhận vai trò gì và muốn giải quyết điều gì?', 'ما الدور الذي توليته وما الهدف الذي سعيت إلى تحقيقه؟', 'Какую роль вы взяли на себя и что хотели решить?',
    'ពេលនោះអ្នកមានតួនាទីអ្វី ហើយចង់ដោះស្រាយអ្វី?', '¿Qué papel asumiste y qué intentabas resolver?', 'Quel rôle avez-vous assumé et que cherchiez-vous à résoudre ?', 'Che ruolo hai assunto e cosa cercavi di risolvere?', 'O vaxt hansı rolu götürdünüz və nəyi həll etməyə çalışırdınız?',
  ],
  'star.coach.support': [
    '모의 연습에서 어떤 도움이나 안내를 제공받았나요?', 'What help or guidance were you given during the simulation?', '模擬練習では、どのような支援や案内を受けましたか？', '模拟练习中，你得到了哪些帮助或指导？', '模擬練習中，你得到了哪些協助或指引？',
    'Дуураймал дасгалын үеэр ямар тусламж, заавар авсан бэ?', 'ในการฝึกจำลอง คุณได้รับความช่วยเหลือหรือคำแนะนำอะไรบ้าง?', 'Trong buổi mô phỏng, bạn được hỗ trợ hoặc hướng dẫn những gì?', 'ما المساعدة أو الإرشادات التي تلقيتها أثناء التدريب المحاكى؟', 'Какую помощь или инструкции вы получили во время симуляции?',
    'ក្នុងការហាត់សាកល្បង អ្នកទទួលបានជំនួយ ឬការណែនាំអ្វីខ្លះ?', '¿Qué ayuda u orientación recibiste durante la simulación?', 'Quelle aide ou quelles consignes avez-vous reçues pendant la simulation ?', 'Quale aiuto o indicazioni hai ricevuto durante la simulazione?', 'Simulyasiya məşqi zamanı hansı kömək və ya təlimat aldınız?',
  ],
  'star.coach.independent': [
    '도움받은 내용과 구분해, 스스로 정하거나 선택한 행동은 무엇인가요?', 'Apart from the help you received, what did you decide or choose to do yourself?', '受けた支援とは別に、自分で決めたり選んだりした行動は何ですか？', '除了获得的帮助，你自己决定或选择了什么行动？', '除了獲得的協助，你自己決定或選擇了什麼行動？',
    'Авсан тусламжаас тусад нь, та өөрөө юу шийдэж эсвэл сонгосон бэ?', 'นอกจากความช่วยเหลือที่ได้รับ คุณตัดสินใจหรือเลือกทำอะไรด้วยตนเอง?', 'Ngoài phần được hỗ trợ, bạn đã tự quyết định hoặc chọn hành động nào?', 'بعيدًا عن المساعدة التي تلقيتها، ما الإجراء الذي قررته أو اخترته بنفسك؟', 'Что вы решили или выбрали сделать самостоятельно, отдельно от полученной помощи?',
    'ក្រៅពីជំនួយដែលបានទទួល តើអ្នកបានសម្រេចចិត្ត ឬជ្រើសរើសធ្វើអ្វីដោយខ្លួនឯង?', 'Aparte de la ayuda recibida, ¿qué decidiste o elegiste hacer por tu cuenta?', 'En dehors de l’aide reçue, qu’avez-vous décidé ou choisi de faire vous-même ?', 'A parte l’aiuto ricevuto, cosa hai deciso o scelto di fare da solo?', 'Aldığınız köməkdən əlavə, özünüz hansı addımı seçdiniz və ya qərar verdiniz?',
  ],
  'star.coach.action': [
    '본인이 직접 한 구체적인 행동은 무엇이었나요?', 'What specific action did you take yourself?', '自分で実際に行った具体的な行動は何ですか？', '你亲自采取了哪些具体行动？', '你親自採取了哪些具體行動？',
    'Та өөрөө ямар тодорхой үйлдэл хийсэн бэ?', 'คุณลงมือทำอะไรด้วยตนเองอย่างเป็นรูปธรรม?', 'Bạn đã trực tiếp thực hiện hành động cụ thể nào?', 'ما الإجراء المحدد الذي قمت به بنفسك؟', 'Какое конкретное действие вы выполнили сами?',
    'តើអ្នកបានធ្វើសកម្មភាពជាក់លាក់អ្វីដោយខ្លួនឯង?', '¿Qué acción concreta realizaste tú?', 'Quelle action concrète avez-vous réalisée vous-même ?', 'Quale azione concreta hai svolto personalmente?', 'Özünüz hansı konkret addımı atdınız?',
  ],
  'star.coach.reason': [
    '그 행동을 선택한 이유는 무엇이었나요?', 'Why did you choose that action?', 'その行動を選んだ理由は何ですか？', '你为什么选择采取这个行动？', '你為什麼選擇採取這個行動？',
    'Та яагаад тэр үйлдлийг сонгосон бэ?', 'เหตุใดคุณจึงเลือกทำเช่นนั้น?', 'Vì sao bạn chọn hành động đó?', 'لماذا اخترت هذا الإجراء؟', 'Почему вы выбрали именно это действие?',
    'ហេតុអ្វីបានជាអ្នកជ្រើសរើសសកម្មភាពនោះ?', '¿Por qué elegiste esa acción?', 'Pourquoi avez-vous choisi cette action ?', 'Perché hai scelto quell’azione?', 'Niyə məhz həmin addımı seçdiniz?',
  ],
  'star.coach.resultSimulation': [
    '모의 연습에서 관찰하거나 판단한 결과는 무엇이었나요?', 'What did you observe or conclude in the simulation?', '模擬練習で観察したこと、または判断した結果は何ですか？', '在模拟练习中，你观察到或判断出的结果是什么？', '在模擬練習中，你觀察到或判斷出的結果是什麼？',
    'Дуураймал дасгалд юу ажигласан эсвэл ямар дүгнэлтэд хүрсэн бэ?', 'ในการฝึกจำลอง คุณสังเกตหรือสรุปผลอะไรได้บ้าง?', 'Trong buổi mô phỏng, bạn quan sát hoặc đưa ra kết luận gì?', 'ما النتيجة التي لاحظتها أو استنتجتها في التدريب المحاكى؟', 'Что вы наблюдали или к чему пришли в ходе симуляции?',
    'ក្នុងការហាត់សាកល្បង អ្នកបានសង្កេត ឬសន្និដ្ឋានលទ្ធផលអ្វី?', '¿Qué observaste o concluiste en la simulación?', 'Qu’avez-vous observé ou conclu pendant la simulation ?', 'Cosa hai osservato o concluso nella simulazione?', 'Simulyasiya məşqində nə müşahidə etdiniz və ya hansı nəticəyə gəldiniz?',
  ],
  'star.coach.resultActual': [
    '관찰하거나 경험한 결과는 무엇이었나요?', 'What result did you observe or experience?', '観察したこと、または実際に起きた結果は何ですか？', '你观察到或经历了什么结果？', '你觀察到或經歷了什麼結果？',
    'Та ямар үр дүн ажигласан эсвэл мэдэрсэн бэ?', 'คุณสังเกตหรือพบผลลัพธ์อะไร?', 'Bạn quan sát hoặc trải nghiệm kết quả nào?', 'ما النتيجة التي لاحظتها أو اختبرتها؟', 'Какой результат вы наблюдали или получили?',
    'តើអ្នកបានសង្កេត ឬជួបប្រទះលទ្ធផលអ្វី?', '¿Qué resultado observaste o experimentaste?', 'Quel résultat avez-vous observé ou vécu ?', 'Quale risultato hai osservato o sperimentato?', 'Hansı nəticəni müşahidə etdiniz və ya yaşadınız?',
  ],
  'star.coach.evidenceSimulation': [
    '모의 연습에서 어떤 정보나 기준을 근거로 판단했나요?', 'What information or criteria supported your judgment in the simulation?', '模擬練習では、どの情報や基準を根拠に判断しましたか？', '在模拟练习中，你依据哪些信息或标准作出判断？', '在模擬練習中，你依據哪些資訊或標準作出判斷？',
    'Дуураймал дасгалд ямар мэдээлэл эсвэл шалгуурт тулгуурлан дүгнэсэн бэ?', 'ในการฝึกจำลอง คุณใช้ข้อมูลหรือเกณฑ์ใดประกอบการตัดสินใจ?', 'Trong buổi mô phỏng, bạn dựa vào thông tin hoặc tiêu chí nào để đưa ra nhận định?', 'ما المعلومات أو المعايير التي استندت إليها في حكمك أثناء التدريب المحاكى؟', 'На какую информацию или критерии вы опирались при оценке в симуляции?',
    'ក្នុងការហាត់សាកល្បង អ្នកផ្អែកលើព័ត៌មាន ឬលក្ខណៈវិនិច្ឆ័យអ្វីដើម្បីសម្រេច?', '¿En qué información o criterios basaste tu decisión en la simulación?', 'Sur quelles informations ou quels critères avez-vous fondé votre jugement pendant la simulation ?', 'Su quali informazioni o criteri hai basato la valutazione nella simulazione?', 'Simulyasiyada qərarınızı hansı məlumat və ya meyara əsaslandırdınız?',
  ],
  'star.coach.evidenceActual': [
    '그 결과를 어떤 자료나 관찰로 확인했나요?', 'What evidence or observation helped you confirm the result?', 'その結果を、どの資料や観察で確認しましたか？', '你通过哪些资料或观察确认了结果？', '你透過哪些資料或觀察確認了結果？',
    'Та үр дүнг ямар баримт эсвэл ажиглалтаар баталгаажуулсан бэ?', 'คุณยืนยันผลลัพธ์จากหลักฐานหรือการสังเกตใด?', 'Bạn xác nhận kết quả bằng tài liệu hoặc quan sát nào?', 'ما الدليل أو الملاحظة التي أكدت لك النتيجة؟', 'Какими данными или наблюдениями вы подтвердили результат?',
    'តើអ្នកបានបញ្ជាក់លទ្ធផលដោយឯកសារ ឬការសង្កេតណា?', '¿Qué prueba u observación te permitió confirmar el resultado?', 'Quelle preuve ou observation vous a permis de confirmer le résultat ?', 'Quale prova o osservazione ti ha permesso di confermare il risultato?', 'Nəticəni hansı sübut və ya müşahidə ilə təsdiqlədiniz?',
  ],
  'star.coach.learning': [
    '이 경험에서 새롭게 알게 된 점은 무엇인가요?', 'What did you learn from this experience?', 'この経験から新たに学んだことは何ですか？', '你从这段经历中学到了什么？', '你從這段經驗中學到了什麼？',
    'Энэ туршлагаас та юу шинээр сурсан бэ?', 'คุณได้เรียนรู้อะไรใหม่จากประสบการณ์นี้?', 'Bạn học được điều gì mới từ trải nghiệm này?', 'ما الذي تعلمته جديدًا من هذه التجربة؟', 'Чему новому вы научились благодаря этому опыту?',
    'តើអ្នកបានរៀនអ្វីថ្មីពីបទពិសោធន៍នេះ?', '¿Qué aprendiste de nuevo con esta experiencia?', 'Qu’avez-vous appris de nouveau grâce à cette expérience ?', 'Cosa hai imparato di nuovo da questa esperienza?', 'Bu təcrübədən yeni nə öyrəndiniz?',
  ],
  'star.coach.reflection': [
    '이 경험에서 배운 점이 현재 문항과 어떻게 연결되나요?', 'How does what you learned connect to this question?', 'この経験からの学びは、現在の設問とどのようにつながりますか？', '你从这段经历中学到的内容与当前问题有什么联系？', '你從這段經驗中學到的內容與目前題目有什麼關聯？',
    'Энэ туршлагаас сурсан зүйл одоогийн асуулттай хэрхэн холбогдож байна вэ?', 'สิ่งที่คุณเรียนรู้จากประสบการณ์นี้เชื่อมโยงกับคำถามปัจจุบันอย่างไร?', 'Điều bạn học được từ trải nghiệm này liên hệ thế nào với câu hỏi hiện tại?', 'كيف يرتبط ما تعلمته من هذه التجربة بالسؤال الحالي؟', 'Как выводы из этого опыта связаны с текущим вопросом?',
    'អ្វីដែលអ្នកបានរៀនពីបទពិសោធន៍នេះភ្ជាប់ទៅនឹងសំណួរបច្ចុប្បន្នយ៉ាងដូចម្តេច?', '¿Cómo se relaciona lo aprendido con esta pregunta?', 'Comment ce que vous avez appris se rapporte-t-il à la question actuelle ?', 'In che modo ciò che hai imparato si collega alla domanda attuale?', 'Bu təcrübədən öyrəndikləriniz hazırkı sualla necə əlaqəlidir?',
  ],
};

import { JOB_CONNECTION_LOCALES, JOB_CONNECTION_RAW } from './job-connection-messages';

const ALL_STAR_RAW = { ...STAR_RAW, ...JOB_CONNECTION_RAW };

export const STAR_MESSAGES: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(ALL_STAR_RAW).map(([key, values]) => [key, [values[0], values[1]]]),
);

export const STAR_PARTIAL: Record<string, Record<string, string>> = Object.fromEntries(
  STAR_LOCALE_ORDER.slice(2).map((locale, index) => [
    locale,
    Object.fromEntries(Object.entries(ALL_STAR_RAW).map(([key, values]) => [key, values[index + 2]])),
  ]),
);

export { JOB_CONNECTION_LOCALES, JOB_CONNECTION_RAW };
