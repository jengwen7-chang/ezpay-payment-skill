const fs = require('fs');
const crypto = require('crypto');

const vectors = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'aes-encryption.json'), 'utf8'));

for (const v of vectors) {
  const blockSize = 32;
  const padding = blockSize - (Buffer.byteLength(v.plaintext) % blockSize);
  const padded = Buffer.concat([Buffer.from(v.plaintext, 'utf8'), Buffer.alloc(padding, padding)]);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(v.hashKey), Buffer.from(v.hashIV));
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]).toString('hex');
  const sha = crypto.createHash('sha256').update(`HashKey=${v.hashKey}&${encrypted}&HashIV=${v.hashIV}`).digest('hex').toUpperCase();
  console.log(v.name);
  console.log('AES hex:', encrypted);
  console.log('SHA256 :', sha);
}
