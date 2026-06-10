const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'onboarding');

fs.readdir(dir, (err, files) => {
  if (err) throw err;
  files.forEach(file => {
    if (file.endsWith('.png')) {
      const input = path.join(dir, file);
      const output = path.join(dir, file.replace('.png', '.webp'));
      sharp(input)
        .webp({ quality: 80 })
        .toFile(output)
        .then(() => {
          console.log(`Converted ${file} to WebP`);
          fs.unlinkSync(input); // Delete original
        })
        .catch(err => console.error(`Error converting ${file}:`, err));
    }
  });
});
