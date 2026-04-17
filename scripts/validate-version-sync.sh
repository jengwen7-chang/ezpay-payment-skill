#!/bin/sh
set -eu

skill_version=$(grep -E '^> Version:' SKILL.md 2>/dev/null | head -1 | sed 's/^> Version:[[:space:]]*//')
readme_version=$(grep -E '^> Version:' README.md 2>/dev/null | head -1 | sed 's/^> Version:[[:space:]]*//')

if [ -n "$skill_version" ] && [ -n "$readme_version" ] && [ "$skill_version" != "$readme_version" ]; then
  echo "Version mismatch: SKILL.md=$skill_version README.md=$readme_version"
  exit 1
fi

echo "Version sync OK (or not explicitly set)"
