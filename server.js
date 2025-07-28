const express = require('express');
const fs = require('fs');
const path = require('path');
const cekNomor = require('./bot'); 
const app = express();
const PORT = process.env.PORT || 3000; 


const chromium = require('@sparticuz/chromium');
const wa = require('@open-wa/wa-automate');


app.use(express.json());
app.use(express.static('public'));


app.post('/cek', async (req, res) => {
  try {
    const raw = req.body.nomor;
    if (!raw) {
      return res.status(400).json({ status: 'error', msg: 'Nomor kosong' });
    }

    const lines = raw
      .split('\n')
      .map(n => n.trim().replace(/[^0-9+]/g, '')) 
      .filter(n => n.length > 0);

   
    fs.writeFileSync('numbers.json', JSON.stringify(lines, null, 2));

    console.log(`▶️ Mulai cek ${lines.length} nomor...`);

    const hasil = await cekNomor(global.client);

    res.json({ status: 'ok', data: hasil });
  } catch (err) {
    console.error('❌ Error di endpoint /cek:', err.message);
    res.status(500).json({ status: 'error', msg: err.message });
  }
});


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
})
.then((client) => {
  global.client = client; 
  app.listen(PORT, () => {
    console.log(`✅ Server running di port ${PORT}`);
  });
})
.catch(err => {
  console.error("❌ Gagal memulai WA client:", err);
  process.exit(1);
});


function cleanup() {
  console.log('⏳ Menjalankan cleanup sebelum shutdown...');
  const folderPath = path.join(__dirname, 'hasil'); 

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
}


process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup); 


process.on('uncaughtException', err => {
    console.error('❌ Uncaught Exception:', err);
    cleanup();
    process.exit(1); 
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    cleanup(); 
    process.exit(1);
});
