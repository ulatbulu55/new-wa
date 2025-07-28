const express = require('express');
const fs = require('fs');
const path = require('path');
const cekNomor = require('./bot'); // Pastikan ini mengimpor fungsi 'cekNomor'
const app = express();
const PORT = process.env.PORT || 3000; // <--- UBAH INI: Gunakan variabel lingkungan PORT dari Render

app.use(express.json());
app.use(express.static('public'));

app.post('/cek', async (req, res) => {
  try {
    const raw = req.body.nomor;
    if (!raw) return res.status(400).json({ status: 'error', msg: 'Nomor kosong' });

    const lines = raw
      .split('\n')
      .map(n => n.trim().replace(/[^0-9+]/g, ''))
      .filter(n => n.length > 0);

    // Pastikan folder 'temp' atau sejenisnya ada jika Anda menulis file sementara
    // Render memiliki ephemeral filesystem, jadi file ini hanya ada selama instance berjalan
    fs.writeFileSync('numbers.json', JSON.stringify(lines, null, 2));

    console.log(`▶️ Mulai cek ${lines.length} nomor...`);
    // Pastikan cekNomor menerima client sebagai argumen
    const hasil = await cekNomor(global.client);

    res.json({ status: 'ok', data: hasil });
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ status: 'error', msg: err.message });
  }
});

const wa = require('@open-wa/wa-automate');
wa.create({
  // <--- HAPUS ATAU KOMENTARI BARIS INI: executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  sessionId: 'session_bot_wa', // Nama sesi Anda (disarankan)
  multiDevice: true,           // Untuk mendukung multi-perangkat
  authTimeout: 60,             // Waktu tunggu autentikasi
  cacheEnabled: false,         // Jika tidak perlu cache
  // Opsi Puppeteer untuk lingkungan Render, ini WAJIB!
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Penting untuk lingkungan dengan RAM terbatas
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',      // Membantu mengurangi penggunaan memori
      '--disable-gpu',
      '--incognito'            // Untuk memastikan sesi bersih setiap kali
    ],
    // Jika Anda ingin mengarahkan Puppeteer ke path spesifik di Render,
    // Anda bisa menggunakan process.env.CHROMIUM_PATH atau bergantung pada 'puppeteer install'
    // Umumnya, jika 'puppeteer install' di 'postinstall' berhasil, ini tidak perlu
    // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  }
}).then((client) => {
  global.client = client;
  app.listen(PORT, () => {
    console.log(`✅ Server running di port ${PORT}`); // Ganti localhost dengan port dinamis
  });
}).catch(err => {
  console.error("❌ Gagal memulai WA client:", err);
  process.exit(1); // Keluar dari proses jika gagal
});

function cleanup() {
  console.log('⏳ Menjalankan cleanup sebelum shutdown...');
  const folderPath = path.join(__dirname, 'hasil'); // folder penyimpanan hasil

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

  // Jika Anda ingin prosesnya keluar setelah cleanup (misalnya saat restart)
  // process.exit(0); // Hanya jika Anda ingin proses langsung mati setelah cleanup
}

// Tambahkan penanganan untuk kesalahan unhandled
process.on('uncaughtException', err => {
    console.error('❌ Uncaught Exception:', err);
    cleanup(); // Lakukan cleanup dan keluar
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    cleanup(); // Lakukan cleanup dan keluar
});

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
// Hapus 'exit' dari cleanup event, karena 'exit' tidak bisa melakukan async ops
// process.on('exit', cleanup);
