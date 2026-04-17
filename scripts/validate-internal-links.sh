#!/bin/sh
set -eu

for f in SKILL.md README.md guides/00-onboarding.md guides/01-encryption-deepdive.md guides/05-webhook-idempotency.md test-vectors/README.md; do
  if [ ! -f "$f" ]; then
    echo "Missing required file: $f"
    exit 1
  fi
done

echo "Internal file presence OK"
