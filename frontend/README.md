# Frontend (React + Vite + TypeScript)

Rol bazlı tek SPA: Abone, Kampanya Uzmanı (Personel), Kampanya Yöneticisi (Süpervizör), Admin.

## Çalıştırma
```bash
cp .env.example .env
npm install
npm run dev
```
`http://localhost:5173` — API Gateway'in `http://localhost:3000` üzerinde çalıştığı varsayılır.

## Yapı
- `src/api/` — her mikroservis için ince axios sarmalayıcıları, standart `{success,data,error}` zarfını açar (`unwrap`)
- `src/auth/` — `AuthContext` (login/logout/oturum), `RequireRole` (rol bazlı route guard), `authStore` (localStorage)
- `src/realtime/useRealtime.ts` — Gamification Service WebSocket'ine bağlanıp `badge.earned`/`points.updated` anlık bildirimlerini toast olarak gösterir
- `src/pages/` — rol bazlı sayfalar (`subscriber/`, `expert/`, `supervisor/`, `admin/`)
- `src/shared/` — ortak bileşenler (Loading/Error/Empty state, Toast, Layout/NavBar, enum→Türkçe etiket eşlemeleri)

## Rol → Ana Sayfa
| Rol | Ana Sayfa |
|---|---|
| Abone | `/subscriber/offers` |
| Personel | `/expert/cases` |
| Süpervizör | `/supervisor/dashboard` |
| Admin | `/admin/staff` |

## Token Yönetimi
`src/api/client.ts` içindeki axios interceptor: her isteğe `Authorization` header'ı ekler; `401` alındığında `/auth/refresh` ile otomatik yeniler ve isteği bir kez tekrar dener, yenileme de başarısız olursa oturumu temizleyip `/login`'e yönlendirir (refresh token rotation ile uyumlu).

## Environment Değişkenleri
| Değişken | Açıklama |
|---|---|
| `VITE_API_BASE_URL` | API Gateway adresi (örn. `http://localhost:3000/api/v1`) |
| `VITE_GAMIFICATION_WS_URL` | WebSocket bağlantısı için gateway kökü (örn. `http://localhost:3000`) |

Not: Vite, `VITE_*` değişkenlerini **build anında** JS bundle'ına gömer; bu yüzden Docker'da bunlar `docker-compose.yml`'de `environment:` değil `build.args` olarak geçirilir.
