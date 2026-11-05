#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker was not found. Install Docker or follow README.md for manual setup." >&2
  exit 1
fi
docker compose up --build
