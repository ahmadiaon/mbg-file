# Dokumentasi Alur Sistem

## Login

Frontend mengirim username dan password ke `POST /api/v1/auth/login`. Backend memverifikasi hash password, kemudian mengembalikan JWT. JWT dikirim pada request berikutnya sebagai `Authorization: Bearer <token>`.

## Upload V1

File dikirim sebagai multipart field `file` ke `POST /api/v1/files`. Backend membuat storage directory baru, menyimpan binary di filesystem, menghitung SHA-256, mencatat metadata pada tabel `files`, dan membuat activity log `upload`.

## Daftar dan download

`GET /api/v1/files` mengembalikan metadata. `GET /api/v1/files/:id/download` hanya mengambil path yang tersimpan di database, bukan path arbitrary dari URL.

Frontend mengunduh file menggunakan request Axios dengan header Bearer dan Blob. Dengan begitu file tetap melewati autentikasi API dan tidak menjadi static asset publik.

## Operasi file

Klik file untuk memilihnya. Aksi `Rename` memanggil `PATCH /api/v1/files/:id`, `Hapus` memanggil `DELETE /api/v1/files/:id`, dan upload pada folder aktif mengirim `folderId`. Pencarian dikirim sebagai query `q`; navigasi folder menggunakan `folderId`.

## File manager penuh

Workspace menampilkan folder dan file pada lokasi aktif, mendukung mode daftar atau grid, breadcrumb, pencarian, pemilihan file, download, rename, pindah ke folder lain, dan hapus. Folder dapat dibuat bertingkat, diubah namanya, dan hanya dapat dihapus ketika kosong. Semua operasi dilindungi JWT dan dicatat melalui activity log untuk operasi file utama.

## Folder dan token

Folder dibuat melalui `POST /api/v1/folders`. Model API token menyediakan nama, hash token, status revoke, waktu terakhir dipakai, dan expiry untuk tahap berikutnya. Permission per folder belum aktif pada V1 awal.

## Legacy

`assets.mitrabaritogroup.com` tetap menjadi aplikasi terpisah. `/upload` dan `/uploads/*` tidak disentuh. Saat kode legacy tersedia, tambahkan pencatatan additive setelah upload berhasil melalui integrasi internal atau database event. Response legacy tetap `{ success: true, url: ... }`.

## Jaringan

Backend listen pada `0.0.0.0:8081`; Vite listen pada `0.0.0.0:8080`. Gunakan IP Mini PC pada `VITE_API_URL` agar perangkat lain di jaringan dapat mengaksesnya. Firewall perlu membuka port yang digunakan.
