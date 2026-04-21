# 🚀 Panduan Instalasi Santri Dana Ku - Backend (cPanel)

Panduan ini menjelaskan langkah-langkah detail untuk menginstal backend Hono di cPanel menggunakan **Node.js Selector**.

## 1. Persiapan File
Sebelum memulai di cPanel, pastikan Anda sudah melakukan build di komputer lokal:
1.  Buka terminal di folder `server/`.
2.  Jalankan perintah:
    ```bash
    npm run build
    ```
3.  Hasilnya adalah file `dist/server.js`.

## 2. Upload ke cPanel
1.  Buka **File Manager** di cPanel.
2.  Buat folder baru (misal: `api-santri`) di luar `public_html` (lebih aman).
3.  Upload file berikut ke folder tersebut:
    -   `dist/server.js`
    -   `package.json`
    -   `cpanel.js` (Wrapper untuk Phusion Passenger)

## 3. Setup Node.js di cPanel
1.  Cari menu **Setup Node.js App** di dashboard cPanel.
2.  Klik **Create Application**.
3.  Isi konfigurasi berikut:
    -   **Node.js version**: Pilih versi terbaru (rekomendasi 20.x atau 22.x).
    -   **Application mode**: Production.
    -   **Application root**: Nama folder yang Anda buat (misal: `api-santri`).
    -   **Application URL**: Subdomain untuk API Anda (misal: `api.santridanaku.com`).
    -   **Application startup file**: `cpanel.js`.
4.  Klik **Create**.

## 4. Konfigurasi Environment Variables
Di halaman Setup Node.js App yang sama, scroll ke bagian **Environment variables**. Tambahkan variabel berikut:
-   `DATABASE_URL`: URL database Neon PostgreSQL Anda.
-   `JWT_SECRET`: Kunci rahasia untuk keamanan login (acak saja).
-   `PORT`: `8080` (Atau biarkan default cPanel).
-   `NODE_ENV`: `production`.

Klik **Save Changes** setelah menambahkan.

## 5. Install Dependencies
1.  Setelah aplikasi di-create, Anda akan melihat tombol **Run NPM Install**.
2.  Klik tombol tersebut dan tunggu sampai selesai.

## 6. Restart Aplikasi
Klik tombol **Restart** di bagian atas halaman Node.js Selector untuk memastikan semua konfigurasi terbaru dimuat.

---

## 🛠️ Fitur yang Tersedia
Server ini sudah mendukung penuh seluruh skema database Neon:
-   **Auth**: Login, Signup, Profile (menggunakan `bcryptjs` agar cocok di cPanel).
-   **Ajuan**: CRUD Proposal, Item, dan History Approval.
-   **Pencairan**: Logika transfer/pencairan dana.
-   **Audit Log**: Pencatatan otomatis setiap aksi (termasuk Alamat IP user).
-   **Notifikasi**: Pengiriman notifikasi sistem secara otomatis.

## ❓ Troubleshooting
-   **Error 503**: Biasanya karena Node.js belum jalan. Coba klik Restart di cPanel.
-   **Database Connection Error**: Pastikan IP server cPanel sudah di-whitelist di Neon (jika menggunakan IP restriction) dan `DATABASE_URL` sudah benar.
-   **Logs**: Coba cek folder `stderr` atau log Passenger di dalam folder root aplikasi Anda.

---
**Santri Dana Ku** - *Solusi Transparansi Anggaran Pesantren.*
