const fs = require('fs');

function convertToJSON() {
  const input = fs.readFileSync('nomor-mentah.txt', 'utf-8');
  const lines = input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !isNaN(line));
  fs.writeFileSync('numbers.json', JSON.stringify(lines, null, 2));
  return lines;
}

module.exports = convertToJSON;
