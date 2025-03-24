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
- Firebase Firestore untuk database real-time
- TypeScript untuk type safety
- Tailwind CSS untuk styling
- Framer Motion untuk animasi

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
firebase deploy --only firestore:rules --project sosmed-34308
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
# Development dengan network access (untuk test multi-device)
npm run dev:network

# Development biasa
npm run dev
```

## Troubleshooting

Jika mengalami masalah dengan koneksi antar perangkat:
1. Bersihkan database dengan `/api/dev/clear-db`
2. Bersihkan browser storage dengan `/api/dev/clear-browser-storage`
3. Restart server development
4. Coba koneksi dari dua perangkat berbeda