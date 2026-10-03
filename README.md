## Menjalankan secara lokal

Aplikasi ini menggunakan MySQL sebagai satu-satunya database. Pastikan layanan MySQL
berjalan (misalnya melalui Laragon atau XAMPP), lalu:

1. Salin `.env.example` menjadi `.env`.
2. Sesuaikan `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` dengan MySQL lokal.
   Akun MySQL harus memiliki izin untuk membuat database dan tabel.
3. Isi `JWT_SECRET` dan kredensial admin awal (`ADMIN_USERNAME`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`) di `.env`.
4. Jalankan:

   ```bash
   npm install
   npm run dev
   ```

Aplikasi tersedia di [http://localhost:3000](http://localhost:3000) dan akan membuat
database serta tabel yang diperlukan pada koneksi pertama. Login dan data aplikasi
tidak tersedia dalam mode demo tanpa MySQL.
