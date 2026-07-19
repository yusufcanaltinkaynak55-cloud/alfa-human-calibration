# ALFA Human Calibration / İnsan Kalibrasyonu

Independent, bilingual and blind human-annotation interface with a 150-item
development calibration bank delivered as three sequential 50-item blocks.

Deneysel belge düzeyi semantik sınıflar için 150 maddelik geliştirme
kalibrasyon bankasını üç ardışık 50'lik bölüm halinde sunan bağımsız, iki dilli
ve kör insan anotasyonu arayüzüdür.

## Scope / Kapsam

This repository contains only the public annotation interface, an unlabeled
150-item development bank, the task protocol, block-level local JSON export and the isolated submission
endpoint source. It does not contain the ALFA core, private datasets, model
predictions, thresholds, formulas, API credentials, stored responses or
internal reports.

Bu depo yalnız kamusal anotasyon arayüzünü, etiketsiz 150 maddelik geliştirme
bankasını, görev protokolünü, bölüm düzeyi yerel JSON dışa aktarımını ve yalıtılmış gönderim uç noktası
kaynağını içerir. ALFA çekirdeğini, özel veri kümelerini, model tahminlerini,
eşikleri, formülleri, API bilgilerini, saklanan yanıtları veya dahili raporları
içermez.

## Privacy / Gizlilik

Draft progress remains in the participant's browser. Nothing is transmitted
while answering. Each completed 50-item block requires a separate explicit
submission action and receives its own receipt. The participant may pause
between blocks or use block-level local JSON export.

For abuse control, the server accepts at most two distinct submissions from the
same network for each block. It stores no raw IP address; only a secret-keyed
one-way network fingerprint is retained for this limit.

Taslak ilerleme katılımcının tarayıcısında kalır. Yanıtlama sırasında hiçbir
veri iletilmez. Tamamlanan her 50 maddelik bölüm ayrı açık gönderim eylemi ve
ayrı teslim numarası gerektirir. Katılımcı bölümler arasında ara verebilir veya
bölüm düzeyi yerel JSON dışa aktarımını kullanabilir.

Kötüye kullanımı sınırlamak için sunucu aynı ağdan her bölüm için en fazla iki
farklı gönderim kabul eder. Ham IP adresi saklanmaz; yalnız bu sınır için gizli
anahtarla üretilmiş tek yönlü ağ parmak izi tutulur.

Do not enter names, email addresses, phone numbers or other personal data.

Ad, e-posta, telefon veya başka kişisel bilgiler girmeyin.

## GitHub Pages

The interface remains static on GitHub Pages. An independently deployed
Supabase Edge Function accepts validated submissions; backend credentials are
stored only in hosted secrets.

Arayüz GitHub Pages üzerinde statik kalır. Bağımsız yayımlanan Supabase Edge
Function doğrulanmış gönderimleri kabul eder; arka uç kimlik bilgileri yalnız
barındırılan gizli değerlerde saklanır.

## Scientific boundary / Bilimsel sınır

This is a development collection and calibration-design tool. The 150 public
items are not validated ground truth. It does not imply ethics committee
approval, completed human calibration, external validation or scientific proof.

Bu araç geliştirme ve kalibrasyon tasarımı içindir. Açık 150 öğe doğrulanmış
temel gerçek değildir. Etik kurul onayı, tamamlanmış insan kalibrasyonu, dış
validasyon veya bilimsel kanıt anlamına gelmez.

See [METHOD.md](METHOD.md), [PRIVACY.md](PRIVACY.md) and
[PUBLICATION_BOUNDARY.md](PUBLICATION_BOUNDARY.md). Deployment maintainers
should also read [SUBMISSION_DEPLOYMENT.md](SUBMISSION_DEPLOYMENT.md).
