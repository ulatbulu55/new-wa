const express = require('express');
const fs = require('fs');
const path = require('path');
const cekNomor = require('./bot'); // Pastikan ini mengimpor fungsi 'cekNomor'
const app = express();
const PORT = process.env.PORT || 3000; // Menggunakan port dinamis dari Render

// Import @sparticuz/chromium untuk Puppeteer yang dioptimalkan untuk cloud
const chromium = require('@sparticuz/chromium');
const wa = require('@open-wa/wa-automate');

// Middleware untuk parsing JSON dan menyajikan file statis
app.use(express.json());
app.use(express.static('public'));

// Endpoint untuk melakukan pengecekan nomor
app.post('/cek', async (req, res) => {
  try {
    const raw = req.body.nomor;
    if (!raw) {
      return res.status(400).json({ status: 'error', msg: 'Nomor kosong' });
    }

    const lines = raw
      .split('\n')
      .map(n => n.trim().replace(/[^0-9+]/g, '')) // Membersihkan input nomor
      .filter(n => n.length > 0);

    // Menulis nomor ke file sementara. Perlu diingat, file ini ephemeral di Render.
    fs.writeFileSync('numbers.json', JSON.stringify(lines, null, 2));

    console.log(`▶️ Mulai cek ${lines.length} nomor...`);
    // Memanggil fungsi cekNomor dengan client WhatsApp
    const hasil = await cekNomor(global.client);

    res.json({ status: 'ok', data: hasil });
  } catch (err) {
    console.error('❌ Error di endpoint /cek:', err.message);
    res.status(500).json({ status: 'error', msg: err.message });
  }
});

// Inisialisasi klien WhatsApp
wa.create({
  sessionId: 'session_bot_wa', // Nama sesi Anda (disarankan)
  multiDevice: true,           // Mengaktifkan dukungan multi-perangkat
  authTimeout: 60,             // Waktu tunggu autentikasi dalam detik
  cacheEnabled: false,         // Menonaktifkan cache jika tidak diperlukan
  // Opsi Puppeteer yang vital untuk lingkungan Render
  puppeteer: {
    executablePath: await chromium.executablePath(), // Menggunakan path Chromium dari @sparticuz/chromium
    args: [
      ...chromium.args, // Menggunakan argumen bawaan dari @sparticuz/chromium
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Penting untuk lingkungan dengan RAM terbatas
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',      // Membantu mengurangi penggunaan memori
      '--disable-gpu',
      '--incognito'            // Untuk memastikan sesi bersih
    ],
  }
})
.then((client) => {
  global.client = client; // Menyimpan klien ke variabel global
  app.listen(PORT, () => {
    console.log(`✅ Server running di port ${PORT}`);
  });
})
.catch(err => {
  console.error("❌ Gagal memulai WA client:", err);
  process.exit(1); // Keluar dari proses jika gagal inisialisasi WA
});

// Fungsi untuk membersihkan file sementara saat shutdown
function cleanup() {
  console.log('⏳ Menjalankan cleanup sebelum shutdown...');
  const folderPath = path.join(__dirname, 'hasil'); // Folder penyimpanan hasil

  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      try {
        fs.unlinkSync(fullPath);
        console.log(`🧹 Hapus: ${file}`);
      } catch (err) {
        console.error(`❌ Gagal hapus ${file}:`, err.message);
      }
    }
  }

  // Menghapus file sementara di root direktori
  const filesToDelete = ['numbers.json', 'hasil.json', 'hasil.xlsx', 'hasil.txt'];
  filesToDelete.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🧹 Hapus: ${file}`);
      } catch (err) {
        console.error(`❌ Gagal hapus ${file}:`, err.message);
      }
    }
  });

  // Tidak memanggil process.exit() di sini agar sistem Render bisa mengelola shutdown
  // Jika Anda ingin proses langsung mati setelah cleanup (misalnya saat restart),
  // Anda bisa menambahkan process.exit(0); tapi biasanya tidak diperlukan di Render.
}

// Penanganan event untuk shutdown yang bersih
process.on('SIGINT', cleanup); // Ctrl+C
process.on('SIGTERM', cleanup); // Sinyal terminasi dari sistem (misal Render saat restart/stop)

// Penanganan untuk error yang tidak tertangkap
process.on('uncaughtException', err => {
    console.error('❌ Uncaught Exception:', err);
    cleanup(); // Lakukan cleanup dan kemudian keluar
    process.exit(1); // Keluar dengan status error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    cleanup(); // Lakukan cleanup dan kemudian keluar
    process.exit(1); // Keluar dengan status error
});
