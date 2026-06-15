# Proposal Agent - Frontend

Frontend untuk Proposal Agent Pipeline Orchestrator. Menggunakan HTML + CSS + ESM Vanilla JS tanpa framework atau bundler.

## Struktur File

```
proposal/
├── index.html          - Main HTML (single page app)
├── css/
│   └── style.css       - Styling (glass morphism dark theme)
├── js/
│   ├── main.js         - Entry point (ESM imports)
│   ├── api.js          - API wrapper (hit /api/proposal/*)
│   ├── ui.js           - UI utilities (toast, modal, toggle)
│   └── components/
│       ├── auth.js     - Login/register
│       ├── setup.js    - API URL configuration
│       ├── session.js  - Create proposal session
│       ├── tracker.js  - Main pipeline tracker + status display
│       ├── upload.js   - BibTeX & PDF upload UI
│       └── refs.js     - Reference list display
└── README.md           - Instruksi penggunaan
```

## Cara Penggunaan

1. **Konfigurasi API URL** - Klik tombol "Pengaturan" di header untuk mengatur Base URL API backend (default: `http://localhost:50607/api`).

2. **Login / Register** - Masukkan username dan password. Jika belum punya akun, klik "Daftar di sini" dan isi kode undangan jika diperlukan.

3. **Buat Sesi Baru** - Masukkan ID sesi (tanpa spasi) dan topik riset, lalu klik "Mulai Pipeline Proposal".

4. **Pantau Pipeline** - Tracker akan menampilkan status pipeline saat ini (P0-P7) dan otomatis refresh setiap 5 detik.

5. **Upload File (P0)** - Pada tahap P0, upload file .bib dan PDF referensi sesuai instruksi yang muncul di layar.

6. **Persetujuan (P1-P6)** - Pada setiap tahap yang membutuhkan approval, baca output proposal lalu klik "Setuju" atau "Revisi" dengan feedback.

## Pipeline Status Flow

```
P0: INIT -> BIB_PARSED -> WAITING_PDFS -> PDFS_UPLOADED -> 
    WAITING_EMBED_SERVER -> EMBED_SERVER_READY -> WAITING_INGEST -> 
    VECTORS_READY -> KG_BUILD -> DONE

P1: INIT -> DRAFT -> GRADING -> WAITING_APPROVAL
P2: INIT -> GAP_ANALYSIS -> DRAFT -> GRADING -> WAITING_APPROVAL
P3: INIT -> HYPOTHESIS -> METHOD_DESIGN -> GRADING -> WAITING_APPROVAL
P4: INIT -> NOVELTY_CHECK -> ROADMAP -> GRADING -> WAITING_APPROVAL
P5: INIT -> TAXONOMY -> NARRATIVE -> GRADING -> WAITING_APPROVAL
P6: INIT -> TIMELINE -> RESOURCES -> GRADING -> WAITING_APPROVAL
P7: INIT -> COMPILE -> FINAL_CHECK -> DONE
```

## API Endpoints

Backend API disajikan oleh NSA (Go) di base URL yang dikonfigurasi.

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/proposal/sessions` - Buat sesi baru
- `GET /api/proposal/sessions/{id}` - Ambil status sesi
- `PUT /api/proposal/sessions/{id}` - Update sesi (status, feedback)
- `POST /api/proposal/sessions/{id}/upload-bib` - Upload file .bib
- `POST /api/proposal/sessions/{id}/upload-pdf` - Upload PDF (multipart + cite_key)
- `PUT /api/proposal/sessions/{id}/embed-endpoint` - Set embed endpoint URL
- `POST /api/proposal/sessions/{id}/resume` - Resume/cek status
- `GET /api/proposal/sessions/{id}/refs` - Daftar semua referensi
- `GET /api/proposal/sessions/{id}/refs/missing-pdfs` - Referensi yang belum ada PDF

## Design

- Dark theme dengan glass morphism (backdrop-filter blur)
- Font: Inter (Google Fonts)
- Responsive (mobile-friendly)
- Bahasa Indonesia untuk seluruh UI text
- Toast notifications untuk feedback
- Loading spinners saat API call
- Interaksi async (no page reload)

## Requirements

- Browser modern yang mendukung ES Modules (Chrome 61+, Firefox 60+, Safari 11+)
- Backend NSA berjalan di URL yang dikonfigurasi
