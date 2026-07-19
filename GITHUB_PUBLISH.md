# GitHub publication / GitHub yayını

Repository name / Depo adı:

`alfa-human-calibration`

Visibility / Görünürlük:

`Public`

## Safe publication rule / Güvenli yayın kuralı

Create a new empty repository and publish only this directory. Never connect
the private ALFA repository or copy its `.git` directory.

Yeni ve boş bir depo oluşturun; yalnız bu dizini yayımlayın. Özel ALFA
deposunu bağlamayın ve `.git` klasörünü kopyalamayın.

Before every release / Her yayından önce:

```text
node scripts/verify-public-package.mjs
```

The command must return `PASS`. Then configure GitHub Pages to publish from the
repository root on the default branch.

Komut `PASS` döndürmelidir. Ardından GitHub Pages’i varsayılan dalın depo
kökünden yayın yapacak şekilde ayarlayın.

The current site has no backend and sends no annotation to a server.

Mevcut sitenin arka ucu yoktur ve hiçbir anotasyonu sunucuya göndermez.

The repository workflow repeats the same allowlist check on every push and pull
request. A file outside the approved public list fails publication.

Depo iş akışı aynı izin listesi kontrolünü her gönderim ve değişiklik isteğinde
tekrarlar. Onaylı kamu listesinin dışındaki bir dosya yayını başarısız kılar.
