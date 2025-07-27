const wa = require("@open-wa/wa-automate");

async function checkNumbers(numbers) {
  const client = await wa.create({
    headless: true,
    useChrome: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    sessionId: "check-wa",
    killProcessOnBrowserClose: true,
    deleteSessionDataOnLogout: true
  });

  const results = [];

  for (const num of numbers) {
    try {
      const exists = await client.isRegisteredUser(`${num}@c.us`);
      results.push({ number: num, status: exists ? "Terdaftar WA" : "Tidak Terdaftar WA" });
    } catch {
      results.push({ number: num, status: "Error" });
    }
  }

  await client.kill();
  return results;
}

module.exports = { checkNumbers };
