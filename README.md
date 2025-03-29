# Anon Chat App

Aplikasi chat anonim yang memungkinkan pengguna berbicara dengan orang lain secara anonim, dengan dukungan pencocokan berdasarkan gender.

## Fitur Utama

- Chat anonim real-time antara dua pengguna
- Pencocokan berdasarkan preferensi gender (laki-laki, perempuan, atau acak)
- Identifikasi unik per perangkat untuk mencegah koneksi dengan diri sendiri
- Antarmuka yang responsif dan mudah digunakan
- Sistem pencocokan otomatis dengan status koneksi yang jelas
- Notifikasi sistem untuk status percakapan (terhubung, terputus, dll.)

## Teknologi

- Next.js (React) untuk frontend
- ~~Socket.io~~ Ably untuk komunikasi real-time (lihat [Ably Migration](#ably-migration))
- TypeScript untuk type safety
- Tailwind CSS untuk styling

## Ably Migration

Aplikasi ini telah dimigrasi dari Socket.io ke Ably untuk mendukung deployment di lingkungan serverless Vercel. Ably menyediakan infrastruktur real-time yang dikelola yang bekerja lebih baik dengan fungsi serverless Vercel.

### Menjalankan dengan Ably

1. Daftar di [Ably](https://ably.com/) dan dapatkan API key
2. Salin file `.env.local.example` menjadi `.env.local` dan isi dengan API key Ably Anda
3. Jalankan aplikasi menggunakan perintah berikut

Lihat [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) untuk informasi lebih lanjut tentang migrasi.

## Sistem Identifikasi Pengguna

Aplikasi menggunakan beberapa layer identifikasi untuk memastikan anonimitas sekaligus mencegah koneksi dengan diri sendiri:

1. **Permanent User ID**: ID yang konsisten di browser yang sama (tersimpan di localStorage)
2. **Device Fingerprint**: Identifikasi unik untuk perangkat berdasarkan karakteristik hardware/browser
3. **Device-Specific User ID**: Kombinasi dari Permanent ID dan Device Fingerprint untuk membedakan perangkat
4. **Browser Token**: Token unik untuk setiap browser untuk identifikasi tambahan

## Tools Debugging

Untuk memudahkan development dan debugging, aplikasi ini dilengkapi dengan tools khusus:

### 1. Database Cleaner

Endpoint: `/api/dev/clear-db?token=dev-debug-token`

Fungsi:
- Menghapus semua data di Firestore database
- Membersihkan koleksi: browserTokens, chatRooms, chatSessions, comments, curhatan, waitingRooms
- Menghapus subcollection messages dalam chatRooms

### 2. Browser Storage Cleaner
firebase deploy --only firestore:rules,firestore:indexes --project sosmed-34308
Endpoint: `/api/dev/clear-browser-storage?token=dev-debug-token`

Fungsi:
- Interface untuk melihat dan menghapus data localStorage dan sessionStorage
- Opsi untuk menghapus hanya data Anon Chat atau semua data browser
- Menampilkan semua data browser secara terstruktur untuk analisis

### 3. Debug Dashboard

URL: `/debug`

Fitur:
- Menampilkan informasi identitas pengguna (User ID, Device Fingerprint, dll.)
- Akses cepat ke semua tool debugging
- Kontrol untuk membersihkan database dengan status feedback
- Shortcut untuk membuka Anon Chat di tab baru untuk testing multi-device

## Cara Menggunakan Debug Tools

1. Akses halaman dashboard debug di `/debug`
2. Untuk membersihkan database, gunakan token default `dev-debug-token`
3. Untuk membersihkan data browser, klik "Open Storage Cleaner"
4. Untuk testing multi-device, gunakan link "Open in New Tab"

## Catatan Keamanan

- Tools debugging HANYA tersedia dalam mode development
- Token diperlukan untuk operasi penghapusan database 
- Gunakan dengan hati-hati karena akan menghapus SEMUA data

## Menjalankan Aplikasi

```bash
# Buat file .env.local dengan API key Ably
cp .env.local.example .env.local
# Edit .env.local dengan API key Anda

# Development dengan network access (untuk test multi-device)
npm run dev:network

# Development biasa
npm run dev
```

## Deployment ke Vercel

1. Buat project baru di [Vercel](https://vercel.com/)
2. Tambahkan environment variable `ABLY_API_KEY` dengan API key Ably Anda
3. Deploy aplikasi ke Vercel

## Troubleshooting

Jika mengalami masalah dengan koneksi antar perangkat:
1. Periksa konsol browser untuk error
2. Verifikasi status koneksi Ably di dashboard Ably
3. Pastikan API key Ably memiliki izin yang tepat (publish/subscribe, presence, history)
4. Bersihkan browser storage dan coba lagi