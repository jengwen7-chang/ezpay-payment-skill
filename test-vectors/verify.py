import json
import hashlib
from pathlib import Path
from Crypto.Cipher import AES

base = Path(__file__).resolve().parent
vectors = json.loads((base / 'aes-encryption.json').read_text())

for v in vectors:
    bs = 32
    raw = v['plaintext'].encode('utf-8')
    pad_len = bs - (len(raw) % bs)
    padded = raw + bytes([pad_len]) * pad_len
    cipher = AES.new(v['hashKey'].encode('utf-8'), AES.MODE_CBC, v['hashIV'].encode('utf-8'))
    encrypted = cipher.encrypt(padded).hex()
    sha = hashlib.sha256(f"HashKey={v['hashKey']}&{encrypted}&HashIV={v['hashIV']}".encode('utf-8')).hexdigest().upper()
    print(v['name'])
    print('AES hex:', encrypted)
    print('SHA256 :', sha)
