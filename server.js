const express = require('express');
const fs = require('fs');
const path = require('path');
const cekNomor = require('./bot');
const app = express();
const PORT = 3000;
 
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
 
    fs.writeFileSync('numbers.json', JSON.stringify(lines, null, 2));
 
    console.log(`▶️ Mulai cek ${lines.length} nomor...`);
    const hasil = await cekNomor(global.client);
 
    res.json({ status: 'ok', data: hasil });
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ status: 'error', msg: err.message });
  }
});
 
const wa = require('@open-wa/wa-automate');
wa.create({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
}).then((client) => {
  global.client = client;
  app.listen(PORT, () => {
    console.log(`✅ Server running di http://localhost:${PORT}`);
  });
});
 
function cleanup() {
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
 
  // Hapus juga file numbers.json jika ada di luar folder
  const filesToDelete = ['numbers.json', 'hasil.json', 'hasil.xlsx', 'hasil.txt'];
filesToDelete.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🧹 Hapus: ${file}`);
  }
});
 
  process.exit();
}
 
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
 
