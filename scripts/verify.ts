#!/usr/bin/env bash
exec "$(dirname "$0")/../apps/web/node_modules/.bin/tsx" "$(dirname "$0")/../apps/web/scripts/verify-receipt.ts" "$@"
