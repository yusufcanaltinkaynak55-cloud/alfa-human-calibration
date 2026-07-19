# Annotation method / Anotasyon yöntemi

## Unit / Birim

Each unit is one bilingual semantic pair: a Turkish text and its English
counterpart. Both are evaluated together.

Her birim iki dilli bir semantik çifttir: Türkçe metin ve İngilizce karşılığı
birlikte değerlendirilir.

## Blindness / Körlük

Annotators do not see ALFA predictions, expected labels, confidence scores or
other annotators' responses.

Anotörler ALFA tahminlerini, beklenen etiketleri, güven skorlarını veya diğer
anotörlerin yanıtlarını görmez.

## Decision classes / Karar sınıfları

- `NET_MEANING` — Clear Meaning / Net Anlam
- `MEANINGFUL_NOISE` — Noisy but Meaningful / Gürültülü ama Anlamlı
- `CONTRADICTION` — Contradictory Text / Çelişkili Metin
- `SEMANTIC_INCOHERENCE` — Semantic Incoherence / Anlamsal Tutarsızlık
- `NO_MEANING` — No Meaning Recovered / Anlam Çıkarılamadı

Annotators also provide confidence from 1 to 5. A short reason is optional and
must not contain personal information.

Anotörler ayrıca 1–5 arasında güven bildirir. Kısa gerekçe isteğe bağlıdır ve
kişisel bilgi içermemelidir.

## Submission / Gönderim

Drafts remain local during annotation. Remote submission is enabled only after
all 50 items in the current block are complete and requires a separate consent
action. The 150-item bank is divided into three sequential 50-item blocks. Each
block has an independent randomized order, submission identifier and receipt.
The server revalidates the package, block identity, exact sample set, decision
vocabulary, confidence range, note length, timestamps and blinding
declarations. A stable block submission identifier makes network retries
idempotent.

Anotasyon sırasında taslaklar yerel kalır. Uzak gönderim yalnız mevcut
bölümdeki 50 öğenin tümü tamamlandığında açılır ve ayrı onay gerektirir. 150
maddelik banka üç ardışık 50'lik bölüme ayrılmıştır. Her bölümün bağımsız
rastgele sırası, gönderim kimliği ve teslim numarası vardır. Sunucu; paketi,
bölüm kimliğini, tam örnek kümesini, karar sözlüğünü, güven aralığını, not
uzunluğunu, zaman bilgilerini ve körlük bildirimlerini yeniden doğrular. Sabit
bölüm gönderim kimliği, ağ yeniden denemelerinin yinelenen kayıt üretmesini
önler.

## Analysis boundary / Analiz sınırı

The public bank and its exports are not calibrated results. Construction
classes are deliberately absent from the public package and must not be treated
as validated labels. Agreement, exclusions, duplicate
control items, missingness and adjudication must be reported before any
scientific claim.

Açık banka ve dışa aktarımları kalibre edilmiş sonuç değildir. Tasarım sınıfları
kamusal pakette bilinçli olarak bulunmaz ve doğrulanmış etiket sayılmamalıdır.
Her bilimsel iddiadan önce uyum, dışlamalar, yinelenen kontrol öğeleri, eksik
yanıtlar ve uzlaşma süreci raporlanmalıdır.
