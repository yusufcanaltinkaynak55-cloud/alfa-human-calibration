# ALFA Human Calibration / İnsan Kalibrasyonu

Independent, bilingual and blind human-annotation interface for experimental
document-level semantic classes.

Deneysel belge düzeyi semantik sınıflar için bağımsız, iki dilli ve kör insan
anotasyonu arayüzüdür.

## Scope / Kapsam

This repository contains only the public annotation interface, an unlabeled
pilot package, the task protocol, local JSON export and the isolated submission
endpoint source. It does not contain the ALFA core, private datasets, model
predictions, thresholds, formulas, API credentials, stored responses or
internal reports.

Bu depo yalnız kamusal anotasyon arayüzünü, etiketsiz pilot paketi, görev
protokolünü, yerel JSON dışa aktarımını ve yalıtılmış gönderim uç noktası
kaynağını içerir. ALFA çekirdeğini, özel veri kümelerini, model tahminlerini,
eşikleri, formülleri, API bilgilerini, saklanan yanıtları veya dahili raporları
içermez.

## Privacy / Gizlilik

Draft progress remains in the participant's browser. Nothing is transmitted
while answering. After completing all items, the participant may explicitly
consent and submit the pseudonymous annotation record to an isolated research
database, or keep using local JSON export.

Taslak ilerleme katılımcının tarayıcısında kalır. Yanıtlama sırasında hiçbir
veri iletilmez. Tüm öğeler tamamlandıktan sonra katılımcı açıkça onay verip
takma adlı anotasyon kaydını yalıtılmış araştırma veritabanına gönderebilir veya
yerel JSON dışa aktarımını kullanabilir.

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

This is a development-pilot collection tool. It does not imply ethics committee
approval, human calibration, external validation or scientific proof.

Bu araç geliştirme pilotu içindir. Etik kurul onayı, insan kalibrasyonu, dış
validasyon veya bilimsel kanıt anlamına gelmez.

See [METHOD.md](METHOD.md), [PRIVACY.md](PRIVACY.md) and
[PUBLICATION_BOUNDARY.md](PUBLICATION_BOUNDARY.md). Deployment maintainers
should also read [SUBMISSION_DEPLOYMENT.md](SUBMISSION_DEPLOYMENT.md).
