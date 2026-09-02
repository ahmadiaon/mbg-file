# MBG File

Platform File Manager MBG yang berdiri sendiri dari aplikasi legacy `assets.mitrabaritogroup.com`.

## Struktur

- `backend`: API NestJS, Prisma, MySQL, dan storage filesystem baru.
- `frontend`: React + Vite untuk akses web melalui IP Mini PC.
- `documentation`: alur sistem, kontrak API, deployment, dan catatan integrasi legacy.

## Development singkat

1. Salin `backend/.env.example` menjadi `backend/.env` dan buat database `mbg_file_manager`.
2. Jalankan `npm install`, `npx prisma generate`, `npx prisma migrate dev --name init`, lalu `npm run seed` di `backend`.
3. Salin `frontend/.env.example` menjadi `frontend/.env`, ganti `MINI-PC-IP`, lalu jalankan `npm install` dan `npm run dev`.

Dummy login development: `admin` / `admin123`.
