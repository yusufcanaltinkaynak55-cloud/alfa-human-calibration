# Privacy and voluntary participation / Gizlilik ve gönüllü katılım

## English

- Participation is voluntary.
- Draft progress is stored in local browser storage until it is reset.
- Nothing is transmitted while answering. After all 50 items in a block are
  complete, the participant may separately consent and press the secure
  submission button. Each block is transmitted separately.
- A submitted record contains the pseudonymous participant code, decisions,
  confidence values, optional notes, item order, timing metadata and a
  secret-keyed one-way network fingerprint.
- The application uses the network fingerprint only to enforce at most two
  distinct submissions from the same network for each 50-item block. The three
  blocks have separate limits, so one participant can complete all three.
- The application database does not store the raw IP address, user agent, real
  name or contact field. The fingerprint is produced with HMAC-SHA256 and a
  hosted secret that is not published. The hosting provider may still process
  technical connection logs under its own policies.
- A study access code is used only to authorize submission. It is not written
  to browser storage or the research table.
- Exported files contain the participant code, decisions, confidence values,
  optional notes and timing metadata.
- Use only a coordinator-provided pseudonymous code. Do not enter a real name,
  email address, telephone number or sensitive information.
- A participant may stop at any time and delete local progress.
- A successful remote submission returns a receipt number. The participant may
  still retain a local JSON copy.
- This development pilot does not claim institutional ethics approval.

## Türkçe

- Katılım gönüllüdür.
- Taslak ilerleme sıfırlanana kadar tarayıcının yerel alanında saklanır.
- Yanıtlama sırasında hiçbir veri iletilmez. Bir bölümdeki 50 öğe
  tamamlandıktan sonra katılımcı ayrıca onay verip güvenli gönderim düğmesine
  basabilir. Her bölüm ayrı iletilir.
- Gönderilen kayıt; takma katılımcı kodunu, kararları, güven değerlerini,
  isteğe bağlı notları, öğe sırasını, zaman bilgisini ve gizli anahtarla
  üretilmiş tek yönlü ağ parmak izini içerir.
- Ağ parmak izi yalnız aynı ağdan her 50 maddelik bölüm için en fazla iki farklı
  gönderim kabul etmek amacıyla kullanılır. Üç bölümün sınırları ayrıdır; bir
  katılımcı üç bölümü de tamamlayabilir.
- Uygulama veritabanında ham IP adresi, tarayıcı bilgisi, gerçek ad veya
  iletişim alanı tutulmaz. Parmak izi, yayımlanmayan barındırılmış bir gizli
  değerle HMAC-SHA256 kullanılarak üretilir. Barındırma sağlayıcısı teknik
  bağlantı kayıtlarını kendi politikaları kapsamında işleyebilir.
- Çalışma erişim kodu yalnız gönderimi yetkilendirmek için kullanılır; tarayıcı
  alanına veya araştırma tablosuna yazılmaz.
- Dışa aktarılan dosya katılımcı kodu, kararlar, güven değerleri, isteğe bağlı
  notlar ve zaman bilgisini içerir.
- Yalnız koordinatörün verdiği takma kodu kullanın. Gerçek ad, e-posta, telefon
  veya hassas bilgi girmeyin.
- Katılımcı istediği zaman bırakabilir ve yerel ilerlemeyi silebilir.
- Başarılı uzak gönderim bir teslim numarası döndürür. Katılımcı ayrıca yerel
  JSON kopyasını saklayabilir.
- Bu geliştirme pilotu kurumsal etik kurul onayı iddia etmez.
