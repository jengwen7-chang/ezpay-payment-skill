#!/bin/sh
set -eu

for f in test-vectors/aes-encryption.json test-vectors/invoice-barcode.json test-vectors/verify-node.js test-vectors/verify.py; do
  if [ ! -f "$f" ]; then
    echo "Missing vector file: $f"
    exit 1
  fi
done

echo "Vector files present"
