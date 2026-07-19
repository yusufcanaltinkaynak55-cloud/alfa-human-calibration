# Secure submission deployment / Güvenli gönderim kurulumu

This document contains no credentials. Secrets must be entered only through the
Supabase secret manager and must never be committed to Git.

Bu belge kimlik bilgisi içermez. Gizli değerler yalnız Supabase gizli değer
yöneticisine girilmeli ve hiçbir zaman Git'e eklenmemelidir.

## Architecture / Mimari

- GitHub Pages serves the static bilingual annotation interface.
- `submit-annotations` is the only public write endpoint.
- The function accepts requests only from the published site (and local
  development origins), requires a coordinator-provided study access code and
  validates each complete 50-item block payload again on the server.
- The database table has Row Level Security enabled and grants no access to
  anonymous or authenticated browser roles.
- A backend-only Supabase secret key performs the insert.
- The application table contains no raw IP-address or user-agent column. The
  function converts the client IP into a secret-keyed HMAC-SHA256 fingerprint.
- A partial unique index provides two atomic network slots per package and
  block. A third distinct submission from the same network to the same block is
  rejected with HTTP `429`. The three blocks have independent quotas.
- The 150-item public bank is accepted only as `BLOCK-01`, `BLOCK-02` or
  `BLOCK-03`, each with its exact 50-item identifier set.
- Repeating the same block `submissionId` returns the original receipt instead of
  creating a duplicate row.

## Required hosted secret / Gerekli barındırılan gizli değer

`ALFA_STUDY_ACCESS_CODE`

`ALFA_IP_HASH_PEPPER`

Use a long, random pilot-specific value and share it only with intended
annotators. Do not put it in `runtime-config.js`, the repository, screenshots,
messages or URLs.

Uzun ve bu pilota özel rastgele bir değer kullanın; yalnız hedef anotörlerle
paylaşın. Bu değeri `runtime-config.js` içine, depoya, ekran görüntülerine,
mesajlara veya URL'lere koymayın.

`ALFA_IP_HASH_PEPPER` must be a separate long random value. It makes the stored
network fingerprint impractical to reverse and must never be reused as the
study access code.

`ALFA_IP_HASH_PEPPER` ayrı ve uzun bir rastgele değer olmalıdır. Saklanan ağ
parmak izinin geri döndürülmesini zorlaştırır ve çalışma erişim koduyla aynı
değer olarak kullanılmamalıdır.

## Deployment order / Kurulum sırası

1. Create a separate Supabase project dedicated to this public pilot.
2. Link this public repository directory to that project.
3. Apply the migration in `supabase/migrations`.
4. Set `ALFA_STUDY_ACCESS_CODE` and `ALFA_IP_HASH_PEPPER` through Supabase
   secrets.
5. Deploy `submit-annotations` with JWT verification disabled as declared in
   `supabase/config.toml`.
6. Put only the public function endpoint in `runtime-config.js` and change
   `submissionEnabled` to `true`.
7. Run `node scripts/verify-public-package.mjs`.
8. Test invalid origin, invalid access code, incomplete payload, successful
   submission, duplicate retry, the third-distinct-submission rejection and
   database invisibility from a browser key.

The Supabase project URL and function endpoint are public identifiers, not
credentials. Secret or service-role keys are never added to the frontend.

Supabase proje URL'si ve işlev adresi kamusal tanımlayıcılardır; kimlik bilgisi
değildir. Secret veya service-role anahtarları hiçbir zaman ön yüze eklenmez.
