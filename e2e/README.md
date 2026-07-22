# CampaignCell — Uçtan Uca (Integration) Testler

Bu paket, **çalışan** sisteme (API Gateway `http://localhost:3000`) gerçek HTTP
istekleri atarak birden fazla servisi birlikte doğrular — unit testlerin (saf
fonksiyon) kapsamadığı servisler-arası akışları test eder.

## Kapsanan senaryolar
- **Auth & Güvenlik** (`auth-security.e2e-spec.ts`): personel girişi + JWT, yanlış
  şifre 401, token'sız erişim 401, **RBAC 403** (PERSONEL → ADMIN endpoint), JWT
  tamper 401, kayıtsız GSM 404, aynı GSM ile 2. kayıt 409, abone giriş + profil.
- **Kampanya → AI → State Machine** (`campaign-flow.e2e-spec.ts`): kampanya
  oluşturma AI sınıflandırmasını tetikler + okunabilir numara üretir, `/ai/recommend`
  skor döner, state machine geçişleri (kural dışı geçiş **422**), servis
  bağımsızlığı.

## Çalıştırma
Önce tüm sistem ayakta ve seed yüklü olmalı:
```bash
docker compose up -d --build
docker compose exec identity-service npm run seed
docker compose exec ai-service npm run seed
# (opsiyonel) campaign/gamification seed'leri ilk boot'ta otomatik yüklenir

npm run test:e2e          # kökten
# veya farklı bir adres:
E2E_BASE_URL=http://localhost:3000/api/v1 npm run test:e2e
```

## Notlar
- İstemci non-2xx'te throw etmez; testler durum kodlarını doğrudan assert eder.
- Personel token'ları test süresince memoize edilir (auth rate limit'i yormamak için).
- State machine testi, ATANDI bir vakayı atandığı uzmanla eşleştirip o kimlikle
  sürer; uygun vaka yoksa anlamlı biçimde atlanır (seed'e sıkı bağımlı değildir).
