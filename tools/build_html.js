const fs = require('fs');
const path = require('path');

const partialsDir = path.join(__dirname, '../src/partials');
const outputFile = path.join(__dirname, '../index.html');

const files = fs.readdirSync(partialsDir)
  .filter(f => f.endsWith('.html'))
  .sort();

console.log('Building index.html from partials:');
const parts = files.map(f => {
  console.log(`  + ${f}`);
  return fs.readFileSync(path.join(partialsDir, f), 'utf-8');
});

const assembled = parts.join('\n');
fs.writeFileSync(outputFile, assembled, 'utf-8');

console.log(`\nSuccessfully assembled ${files.length} partials into index.html (${assembled.split('\n').length} lines).`);
