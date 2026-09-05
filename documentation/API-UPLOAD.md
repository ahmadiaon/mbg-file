# API Upload File — Panduan untuk Partner

Gunakan panduan ini untuk meng-upload file ke MBG File Manager lewat API (misalnya dari script, aplikasi, atau sistem otomatis).

## Alamat Server

| Lingkungan | Base URL |
|------------|----------|
| Publik | `https://file.mitrabaritogroup.com` |
| Internal (opsional) | `http://10.10.20.253:8081` |

Semua endpoint memakai prefix `/api/v1`.

---

## 1. Siapkan API Token

API token dibuat oleh admin MBG File Manager (menu **⌘ API token** di sidebar aplikasi). Mintalah token tersebut kepada admin.

> Token lengkap hanya ditampilkan **sekali** saat dibuat. Simpan di tempat aman.

Token dipakai lewat salah satu header berikut (pilih salah satu):

```
Authorization: Bearer <TOKEN>
```

atau

```
X-API-Token: <TOKEN>
```

---

## 2. Upload File

### Endpoint

```
POST /api/v1/external/upload
```

### Format

Gunakan `multipart/form-data`.

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `file` | file | Ya | File yang di-upload |
| `folderPath` | text | Opsional | Lokasi tujuan, contoh `2026/Januari/Laporan`. Folder dibuat otomatis jika belum ada. |
| `folderId` | text | Opsional | ID folder tujuan (alternatif dari `folderPath`). |

> Gunakan salah satu antara `folderPath` atau `folderId`. Jika keduanya kosong, file masuk ke root.

### Contoh dengan curl

```bash
curl -X POST "https://file.mitrabaritogroup.com/api/v1/external/upload" \
  -H "Authorization: Bearer mbg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -F "file=@/path/ke/file.pdf" \
  -F "folderPath=2026/Januari/Laporan"
```

### Contoh dengan PHP

```php
$token = 'mbg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
$file = new CURLFile('/path/ke/file.pdf', 'application/pdf', 'file.pdf');

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => 'https://file.mitrabaritogroup.com/api/v1/external/upload',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
    CURLOPT_POSTFIELDS => [
        'file' => $file,
        'folderPath' => '2026/Januari/Laporan',
    ],
]);

$response = curl_exec($curl);
curl_close($curl);
echo $response;
```

### Contoh dengan Python

```python
import requests

url = "https://file.mitrabaritogroup.com/api/v1/external/upload"
headers = {"Authorization": "Bearer mbg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}

with open("/path/ke/file.pdf", "rb") as f:
    response = requests.post(
        url,
        headers=headers,
        files={"file": ("file.pdf", f, "application/pdf")},
        data={"folderPath": "2026/Januari/Laporan"},
    )

print(response.status_code)
print(response.json())
```

---

## 3. Respons

### Sukses (200)

```json
{
  "id": 123,
  "filename": "1725512345678-file.pdf",
  "originalFilename": "file.pdf",
  "storagePath": "/path/storage/1725512345678-file.pdf",
  "mimeType": "application/pdf",
  "size": 1048576,
  "sha256": "abc123...",
  "source": "external",
  "folderId": 5,
  "uploadedBy": 1,
  "createdAt": "2025-09-05T04:00:00.000Z",
  "updatedAt": "2025-09-05T04:00:00.000Z"
}
```

### Error

| Kode | Arti |
|------|------|
| `400` | Field `file` kosong/tidak ada |
| `401` | Token hilang, salah, atau kedaluwarsa |

---

## 4. Catatan Penting

- Token yang statusnya **REVOKED** atau sudah lewat `expiresAt` tidak bisa dipakai.
- Ukuran file mengikuti batas server. Pastikan file ≤ 50 MB (atau sesuai kebijakan admin).
- Nama file dengan karakter ilegal (`\ / : * ? " < > |`) otomatis dibersihkan.
