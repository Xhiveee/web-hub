#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
OUT="hub-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$OUT" data
echo "Backup: $PWD/$OUT"
