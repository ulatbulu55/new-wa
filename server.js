const express = require('express');
const fs = require('fs');
const path = require('path');
const cekNomor = require('./bot');
const app = express();
const PORT = process.env.PORT || 3000;

const chromium = require('@sparticuz/chromium'); 

const wa = require('@open-wa/wa-automate');
wa.create({
  sessionId: 'session_bot_wa',
  multiDevice: true,
  authTimeout: 60,
  cacheEnabled: false,
  
  puppeteer: {
    executablePath: await chromium.executablePath(), 
    args: [
      ...chromium.args, 
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--incognito'
    ],
  }
}).then((client) => {
  global.client = client;
  app.listen(PORT, () => {
    console.log(`✅ Server running di port ${PORT}`);
  });
}).catch(err => {
  console.error("❌ Gagal memulai WA client:", err);
  process.exit(1);
});


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
}


process.on('uncaughtException', err => {
    console.error('❌ Uncaught Exception:', err);
    cleanup(); 
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    cleanup(); 
});

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
