# 📦 JTInventory — Campus Equipment & Lab Inventory System

> Sistem Manajemen Inventaris dan Peminjaman Alat Laboratorium Kampus berbasis **Next.js (App Router)**, **PostgreSQL**, dan **Prisma ORM** dengan implementasi **Role-Based Access Control (RBAC)** dan **Automated Testing**.

---

## 🎯 Latar Belakang & Motivasi

Proyek **JTInventory** dibangun sebagai sarana eksplorasi mendalam terhadap arsitektur modern web development menggunakan ekosistem **Next.js**, **PostgreSQL**, dan teknologi industri yang umum digunakan pada aplikasi skala produksi:

1. **Memahami Arsitektur Next.js Modern (App Router & Server-First)**:
   - Memaksimalkan penggunaan **React Server Components (RSC)** untuk efisiensi rendering dan keamanan akses database langsung di server tanpa mengekspos logic ke client.
   - Mengombinasikan **Client Components** secara selektif hanya untuk interaktivitas form dialog, filter data, dan state UI.
   - Membangun **Route Handlers (`app/api/`)** yang aman dengan validasi input server-side yang ketat.

2. **Penguasaan Relational Database & ORM (PostgreSQL + Prisma)**:
   - Merancang relasi entitas database yang kompleks (relasi *One-to-Many*, *Many-to-Many* dengan junction table `loan_items`).
   - Menerapkan **Prisma Database Transactions (`prisma.$transaction`)** untuk memastikan integritas data saat peminjaman dan pengembalian (decrement/increment stok dilakukan secara atomik).
   - Mengelola skema melalui **Prisma Migrations** dan data seeding otomatis.

3. **Keamanan & Role-Based Access Control (RBAC)**:
   - Mengintegrasikan **NextAuth.js (Auth.js)** dengan *Credentials Provider* dan *JWT Session Strategy*.
   - Menerapkan *server-side authorization guard* (`auth-guard.ts`) sehingga pembatasan akses data dilakukan di level server, bukan sekadar menyembunyikan tombol di antarmuka pengguna.
   - Hashing password menggunakan **bcryptjs** dan memastikan hash tidak pernah terekspos ke response API.

4. **Kualitas Kode & Pengujian Otomatis (Testing Culture)**:
   - Mengadopsi **Vitest** untuk pengujian cepat dengan konfigurasi mock terisolasi.
   - Mengimplementasikan **57 automated test cases** (Unit Tests & Integration Tests) untuk memverifikasi logika bisnis krusial, transisi status peminjaman, serta proteksi hak akses per-role.

---

## 🚀 Fitur Utama

- 🔐 **Multi-Role Authentication & Authorization (RBAC)**:
  - **Teknisi**: Mengelola master data inventaris, kategori, user, menyetujui/menolak pengajuan pinjaman, memproses serah-terima barang (*borrowing*), dan mencatat pengembalian (*return*).
  - **Dosen & Mahasiswa**: Melihat inventaris yang aktif dan tersedia, mengajukan peminjaman multi-item, melacak status peminjaman, serta memantau tanggal jatuh tempo (*due date*).
- 📋 **Siklus Hidup Peminjaman Lengkap (Loan Lifecycle)**:
  - `PENDING` ➔ `APPROVED` / `REJECTED` ➔ `BORROWED` ➔ `RETURNED`.
  - Validasi ketat: Mahasiswa diwajibkan melampirkan bukti Kartu Tanda Mahasiswa (KTM), sedangkan Dosen memiliki alur pengajuan tanpa KTM.
- 📦 **Manajemen Stok Atomik (Transaction-Safe)**:
  - Stok `available_quantity` barang hanya dikurangi saat status berubah menjadi `BORROWED` (fisik diserahkan) dan otomatis dikembalikan saat barang di-`RETURN`.
- ⚠️ **Deteksi & Peringatan Jatuh Tempo (Overdue Detection)**:
  - Dashboard analitik real-time yang menghitung hari keterlambatan dan menampilkan *alert banner* peringatan untuk peminjam maupun teknisi.
- 🧪 **Comprehensive Automated Testing**:
  - 57 pengujian otomatis yang mencakup *Unit Test* (`auth-guard`) dan *Integration Test* (`loans-create`, `loans-edit`, `loans-workflow`).

---

## 🛠️ Tech Stack

| Layer | Teknologi | Keterangan |
|---|---|---|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | Server Components, Server-side data fetching |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Type safety di seluruh layer aplikasi |
| **UI & Styling** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) | Styling modern dengan utilitas CSS terkini |
| **Components** | [shadcn/ui](https://ui.shadcn.com/), Lucide Icons | Primitive UI components yang fleksibel |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | Relational Database Management System |
| **ORM** | [Prisma ORM](https://www.prisma.io/) (`@prisma/adapter-pg`) | Data modeling, migration, dan query builder |
| **Authentication**| [NextAuth.js (Auth.js)](https://next-auth.js.org/) | JWT session, Credentials provider, bcryptjs |
| **Testing** | [Vitest](https://vitest.dev/), `@vitest/coverage-v8` | Automated Unit & Integration testing suite |

---

## 🗄️ Arsitektur Data (Schema & Entity)

```text
users ──────────< loans (borrower)
users ──────────< loans (approver)
users ──────────< items (maintainer)
categories ─────< items
loans ──────────< loan_items >────────── items
```

- **`User`**: Data pengguna (`MAHASISWA`, `DOSEN`, `TEKNISI`) dengan nomor identitas unik (NIM/NIDN/NIP).
- **`Category`**: Pengelompokan jenis alat inventaris.
- **`Item`**: Master data alat/barang laboratorium (jumlah total, ketersediaan, kondisi: `GOOD`, `DAMAGED`, `MAINTENANCE`, serta status aktif).
- **`Loan`**: Header transaksi peminjaman (status, tanggal pengajuan, tanggal jatuh tempo, catatan pengembalian, URL dokumen KTM).
- **`LoanItem`**: Detail barang per transaksi peminjaman (mendukung 1 peminjaman untuk banyak jenis barang sekaligus).

---

## ⚡ Panduan Instalasi Lokal

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 20 atau lebih baru)
- [PostgreSQL](https://www.postgresql.org/) (sudah berjalan secara lokal atau cloud seperti Neon/Supabase)

### 2. Clone Repository
```bash
git clone https://github.com/mulkihakim/jtinventory.git
cd jtinventory
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Konfigurasi Environment Variables
Salin template file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi koneksi database Anda di `.env`:
```env
DATABASE_URL="postgresql://postgres:password_kamu@localhost:5432/inventory_management?schema=public"
AUTH_SECRET="bebas-minimal-32-karakter-acak-rahasia"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. Setup Database & Seeding
Jalankan migrasi database dan masukkan data awal (dummy users, kategori, dan barang):
```bash
npx prisma migrate dev
npx prisma db seed
# Atau cukup jalankan script utilitas:
npm run db:reset
```

### 6. Menjalankan Aplikasi
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🔑 Akun Demo (Default Seed)

Setelah proses `seed` selesai, Anda dapat login menggunakan akun pengujian berikut:

| Role | Email | Password | Hak Akses |
|---|---|---|---|
| **Teknisi** | `teknisi@test` | `teknisi123` | Akses penuh dashboard, inventaris, kategori, user, dan proses persetujuan |
| **Dosen** | `dosen@test` | `dosen123` | Melihat barang tersedia, mengajukan pinjaman (tanpa wajib KTM) |
| **Mahasiswa** | `mahasiswa@test` | `mahasiswa123` | Melihat barang tersedia, mengajukan pinjaman (wajib upload foto KTM) |

---

## 🧪 Pengujian Otomatis (Automated Testing)

Proyek ini dilengkapi dengan rangkaian pengujian komprehensif menggunakan **Vitest**:

```bash
# Menjalankan seluruh test suite
npm test

# Menjalankan test dalam mode watch (interaktif saat development)
npm run test:watch

# Melihat laporan code coverage
npm run test:coverage
```

**Ringkasan Test Suite**:
- `__tests__/unit/auth-guard.test.ts`: Verifikasi session extraction, validasi format user, dan HTTP status code (401 Unauthorized / 403 Forbidden).
- `__tests__/integration/api/loans-create.test.ts`: Validasi pengajuan pinjaman, proteksi injeksi status, validasi wajib KTM mahasiswa, dan pencegahan duplikasi barang.
- `__tests__/integration/api/loans-edit.test.ts`: Validasi modifikasi permohonan pinjaman hanya pada status `PENDING` dan pengecekan stok tersedia.
- `__tests__/integration/api/loans-workflow.test.ts`: Pengujian alur kerja transaksi (`APPROVE`, `REJECT`, `BORROW`, `RETURN`, dan `DELETE`) beserta mutasi stok database secara atomik.

---
