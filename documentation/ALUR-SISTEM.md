# Dokumentasi Alur Sistem

## Login

Frontend mengirim username dan password ke `POST /api/v1/auth/login`. Backend memverifikasi hash password, kemudian mengembalikan JWT. JWT dikirim pada request berikutnya sebagai `Authorization: Bearer <token>`.

## Upload V1

File dikirim sebagai multipart field `file` ke `POST /api/v1/files`. Backend membuat storage directory baru, menyimpan binary di filesystem, menghitung SHA-256, mencatat metadata pada tabel `files`, dan membuat activity log `upload`.

## Daftar dan download

`GET /api/v1/files` mengembalikan metadata. `GET /api/v1/files/:id/download` hanya mengambil path yang tersimpan di database, bukan path arbitrary dari URL.

## Folder dan token

Folder dibuat melalui `POST /api/v1/folders`. Model API token menyediakan nama, hash token, status revoke, waktu terakhir dipakai, dan expiry untuk tahap berikutnya. Permission per folder belum aktif pada V1 awal.

## Legacy

`assets.mitrabaritogroup.com` tetap menjadi aplikasi terpisah. `/upload` dan `/uploads/*` tidak disentuh. Saat kode legacy tersedia, tambahkan pencatatan additive setelah upload berhasil melalui integrasi internal atau database event. Response legacy tetap `{ success: true, url: ... }`.

## Jaringan

Backend listen pada `0.0.0.0:3001`; Vite listen pada `0.0.0.0`. Gunakan IP Mini PC pada `VITE_API_URL` agar perangkat lain di jaringan dapat mengaksesnya. Firewall perlu membuka port yang digunakan.
