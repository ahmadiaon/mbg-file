# Akses File Manager - file.mitrabaritogroup.com

## Status Konfigurasi

### ✅ Yang Sudah Berjalan

**Service Aktif:**
- Backend File Manager: `http://10.10.20.253:8081`
- HTTPS Proxy: `https://10.10.20.253:8443` 
- HTTP Redirect: `http://10.10.20.253:8088` → HTTPS 8443

**DNS:**
- `file.mitrabaritogroup.com` → `10.10.20.253`

**PM2 Services:**
- `mbg-file-backend` (ID 2) - Backend NestJS port 8081
- `mbg-file-proxy` (ID 15) - HTTPS Proxy port 8088/8443

### 🌐 Cara Akses

#### Dari Jaringan Lokal (LAN):

**Dengan Port (RECOMMENDED):**
```
https://file.mitrabaritogroup.com:8443
http://file.mitrabaritogroup.com:8088 (redirect ke HTTPS)
```

**Dengan IP:**
```
https://10.10.20.253:8443
http://10.10.20.253:8088
```

⚠️ Browser akan warning self-signed certificate - klik "Advanced" → "Proceed to site"

#### Kenapa Perlu Port?

Port 80/443 standard memerlukan root/sudo privilege untuk binding. Ada 3 opsi:

1. **Akses dengan port :8443** (solusi saat ini - sudah berfungsi)
2. **Setup Nginx dengan sudo** (perlu password admin)
3. **Port forwarding di router untuk akses dari internet** (jika perlu akses dari luar)

### 📋 Alur Lengkap file.mitrabaritogroup.com

```
Browser Request
    ↓
https://file.mitrabaritogroup.com:8443
    ↓
DNS Resolve: 10.10.20.253
    ↓
Server Mini PC (10.10.20.253)
    ↓
PM2: mbg-file-proxy (HTTPS Proxy)
    ↓
Port 8443 → SSL/TLS (self-signed cert)
    ↓
Proxy ke Backend: localhost:8081
    ↓
PM2: mbg-file-backend (NestJS)
    ↓
File Manager API
```

### 🔧 Jika Ingin Akses Tanpa Port (Perlu Sudo)

Untuk setup Nginx reverse proxy di port 80/443:

```bash
# Install Nginx (perlu sudo password)
sudo apt install nginx

# Konfigurasi akan ditambahkan di /etc/nginx/sites-available/
```

Atau gunakan authbind:
```bash
sudo apt install authbind
sudo touch /etc/authbind/byport/80
sudo touch /etc/authbind/byport/443
sudo chmod 755 /etc/authbind/byport/80
sudo chmod 755 /etc/authbind/byport/443
```

### ✅ Kesimpulan

**File manager sudah bisa diakses dengan sempurna menggunakan:**
- `https://file.mitrabaritogroup.com:8443`
- `https://10.10.20.253:8443`

Untuk akses tanpa port, diperlukan setup Nginx atau authbind dengan sudo privilege.
