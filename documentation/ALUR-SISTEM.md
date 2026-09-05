# Dokumentasi Alur Sistem

## Login

Frontend mengirim username dan password ke `POST /api/v1/auth/login`. Backend memverifikasi hash password, kemudian mengembalikan JWT. JWT dikirim pada request berikutnya sebagai `Authorization: Bearer <token>`.

## Upload V1

File dikirim sebagai multipart field `file` ke `POST /api/v1/files`. Backend membuat storage directory baru, menyimpan binary di filesystem, menghitung SHA-256, mencatat metadata pada tabel `files`, dan membuat activity log `upload`.

## Daftar dan download

`GET /api/v1/files` mengembalikan metadata. `GET /api/v1/files/:id/download` hanya mengambil path yang tersimpan di database, bukan path arbitrary dari URL.

Frontend mengunduh file menggunakan request Axios dengan header Bearer dan Blob. Dengan begitu file tetap melewati autentikasi API dan tidak menjadi static asset publik.

## Share link untuk Mini PC

Pilih file lalu klik `Share link`. Backend membuat token acak dan mengembalikan URL `GET /api/v1/public/share/:token`. Endpoint publik hanya dapat mengakses file yang secara eksplisit dibagikan dan tidak membuka path filesystem. Link dapat dibuka dari laptop, Mini PC, atau client lain yang memiliki URL.

Workflow penggunaan: upload database dari laptop, pilih file tersebut, klik `Share link`, lalu gunakan URL yang tampil pada Mini PC. Untuk akses programatis, Mini PC dapat mengunduh URL share dengan `curl -L -o database.sql '<URL>'`. Link dapat dinonaktifkan melalui API `DELETE /api/v1/files/:id/share`.

## Operasi file

Klik file untuk memilihnya. Aksi `Rename` memanggil `PATCH /api/v1/files/:id`, `Hapus` memanggil `DELETE /api/v1/files/:id`, dan upload pada folder aktif mengirim `folderId`. Pencarian dikirim sebagai query `q`; navigasi folder menggunakan `folderId`.

## File manager penuh

Workspace menampilkan folder dan file pada lokasi aktif, mendukung mode daftar atau grid, breadcrumb, pencarian, pemilihan file, download, rename, pindah ke folder lain, dan hapus. Folder dapat dibuat bertingkat, diubah namanya, dan hanya dapat dihapus ketika kosong. Semua operasi dilindungi JWT dan dicatat melalui activity log untuk operasi file utama.

## Folder dan token

Folder dibuat melalui `POST /api/v1/folders`. API token dibuat melalui `POST /api/v1/tokens` setelah login JWT. Token lengkap hanya ditampilkan sekali, lalu disimpan sebagai hash. Token dapat dicabut melalui `DELETE /api/v1/tokens/:id`.

## Upload dari luar

Endpoint khusus untuk aplikasi, script, atau perangkat lain:

```text
POST /api/v1/external/upload
```

Autentikasi memakai salah satu header:

```http
Authorization: Bearer <API_TOKEN>
X-API-Token: <API_TOKEN>
```

Body multipart:

- `file`: wajib
- `folderId`: opsional
- `folderPath`: opsional, contoh `Kamera/2026`

Contoh:

```bash
curl -X POST https://file.mitrabaritogroup.com/api/v1/external/upload \
  -H "Authorization: Bearer mbg_xxx" \
  -F "file=@foto.jpg" \
  -F "folderPath=Kamera"
```

Membuat token:

```bash
curl -X POST https://file.mitrabaritogroup.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

curl -X POST https://file.mitrabaritogroup.com/api/v1/tokens \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Upload eksternal"}'
```

## Legacy

`assets.mitrabaritogroup.com` tetap menjadi aplikasi terpisah. `/upload` dan `/uploads/*` tidak disentuh. Saat kode legacy tersedia, tambahkan pencatatan additive setelah upload berhasil melalui integrasi internal atau database event. Response legacy tetap `{ success: true, url: ... }`.

## Jaringan

Backend listen pada `0.0.0.0:8081`; Vite listen pada `0.0.0.0:8080`. Gunakan IP Mini PC pada `VITE_API_URL` agar perangkat lain di jaringan dapat mengaksesnya. Firewall perlu membuka port yang digunakan.
