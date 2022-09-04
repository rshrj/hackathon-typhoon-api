const path = require('path');
const fs = require('fs');

// To check & create uploaded folder in public folder in root directory .
let folderName = path.join(__dirname, '..', '..', 'public');

if (!fs.existsSync(folderName)) {
  fs.mkdirSync(folderName);
}
folderName = path.join(folderName, 'uploaded');

if (!fs.existsSync(folderName)) {
  fs.mkdirSync(folderName);
}

module.exports = folderName;
