# KahveCell

Kahve abonelik platformu için ayrı `frontend` ve `backend` klasörleri içeren uçtan uca demo uygulaması.

## Teknolojiler

- Frontend: React 19, TypeScript, Vite, Zustand yaklaşımı, Leaflet/OpenStreetMap
- Backend: Node.js, Express, JWT, SQL.js (ilişkisel SQL veritabanı), Helmet, CORS
- Özellikler: GSM/SMS OTP simülasyonu, profil, abonelik, ödeme simülasyonu, konum/harita, QR sipariş, sipariş durumu

## Çalıştırma

### Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

API: `http://localhost:4000`  
Health: `http://localhost:4000/api/v1/health`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Arayüz: `http://localhost:5173`

## Demo Bilgileri

- SMS OTP: `1234`
- Başarılı ödeme kartı: `4242-4242-4242-4242`
- Başarısız ödeme kartı: `4000-0000-0000-0002`

## API Modülleri

- `/api/v1/auth/*`: kayıt, OTP doğrulama, token yenileme
- `/api/v1/subscriptions/*`: paketler ve aktif abonelik
- `/api/v1/payments/process`: ödeme simülasyonu
- `/api/v1/shops`: konum bazlı dükkânlar
- `/api/v1/orders`: sipariş oluşturma, geçmiş, durum ve QR doğrulama

## Mimari

Backend controller/service katmanlarının işlevleri tek Express modülünde toplanmış bir MVP mimarisi kullanır. İleride PostgreSQL ve Redis entegrasyonu için SQL ve iş mantığı ayrımı oluşturulabilir. Frontend keşif, paket ve sipariş ekranlarını bileşen tabanlı tek uygulamada sunar.
