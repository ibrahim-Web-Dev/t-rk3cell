# Identity Service

## Sorumluluk
Kayıt/giriş, JWT access + opaque refresh token yönetimi (rotation + reuse detection), rol/yetki (RBAC), hesap kilitleme ve **merkezi audit log** (diğer servislerin RabbitMQ üzerinden yayınladığı `audit.log.entry` event'lerini de tüketip kendi veritabanına yazar).

Veritabanı: PostgreSQL (`identity_db`) — yalnızca bu servis erişir.

## Çalıştırma
```bash
cp .env.example .env
npm install
npm run prisma:migrate:dev
npm run seed
npm run start:dev
```
Swagger: `http://localhost:3001/docs`

## Demo Kullanıcılar
| Rol | E-posta / GSM | Şifre |
|---|---|---|
| Admin | admin@campaigncell.com | Password1! |
| Süpervizör | supervisor@campaigncell.com | Password1! |
| Personel (RISKLI_KAYIP / MARMARA) | uzman1@campaigncell.com | Password1! |
| Personel (YUKSEK_DEGER, YENI_ABONE / EGE) | uzman2@campaigncell.com | Password1! |
| Personel (PASIF, BELIRSIZ / IC_ANADOLU) | uzman3@campaigncell.com | Password1! |
| Abone | GSM: 5551234567 | OTP: 1234 (simülasyon) |

## Endpointler (prefix: `/api/v1`)
| Method | Endpoint | Yetki | Açıklama |
|---|---|---|---|
| POST | `/auth/subscriber/otp/request` | Public | GSM'e OTP gönderir (simülasyon: 1234) |
| POST | `/auth/subscriber/otp/verify` | Public | OTP doğrular, yoksa abone kaydı oluşturur, token döner |
| POST | `/auth/staff/login` | Public | Personel/Süpervizör/Admin girişi |
| POST | `/auth/refresh` | Public (token zorunlu) | Refresh token rotation |
| POST | `/auth/logout` | Authenticated | Refresh token'ı geçersiz kılar |
| GET | `/users/me` | Authenticated | Kendi profilini görür |
| POST | `/users/staff` | ADMIN | Personel hesabı oluşturur, `staff.created` event yayınlar |
| GET | `/users/staff` | SUPERVISOR, ADMIN | Personel listesi (manuel atama için) |
| GET | `/users/:id` | SUPERVISOR, ADMIN veya kendi kaydı | Kullanıcı detayı |
| GET | `/audit-logs` | ADMIN | Merkezi audit log |

## Environment Değişkenleri
| Değişken | Açıklama |
|---|---|
| `PORT` | HTTP portu (varsayılan 3001) |
| `DATABASE_URL` | PostgreSQL bağlantı string'i |
| `JWT_SECRET` | **Tüm servislerde aynı olmalı** — her servis JWT'yi kendi içinde bağımsız doğrular |
| `RABBITMQ_URL` | Ortak event bus bağlantısı |

## Güvenlik Notları
- Şifreler bcryptjs ile hash'lenir (12 round), düz metin asla saklanmaz.
- Refresh token'lar veritabanında yalnızca SHA-256 hash'i olarak tutulur.
- 5 başarısız girişte hesap 15 dakika kilitlenir (`423 Locked` + kalan süre).
- Refresh token rotation: kullanılan token geçersiz kılınır; geçersiz kılınmış bir token tekrar kullanılırsa kullanıcının **tüm** oturumları sonlandırılır.
- Her 401/403 yanıtı otomatik olarak audit log'a düşer (bkz. `@campaigncell/common-kit`).
