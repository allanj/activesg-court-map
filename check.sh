#!/usr/bin/env sh
#
# Project checks: syntax, manifest validity, and data-drift validation.
# Used by CI (.github/workflows/ci.yml) and the SessionStart hook.
#
set -e

cd "$(dirname "$0")"

for f in popup.js sidebar.js content.js background.js venues.js geocache.js \
         build-geocache.js venue-names.js validate.js; do
  echo "node --check $f"
  node --check "$f"
done

node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"

node validate.js
