#!/usr/bin/env bash
# Refresh the vendored CMS in `public/cms/` from a ContentTools checkout.
#
#   ./scripts/sync-cms.sh ../ContentTools
#
# The package is not on npm and its `dist/` is gitignored, so there is
# nothing to install; the built artifacts are copied in and committed. When
# that changes this script is what gets deleted.
#
# It exists rather than a line in the README for one reason: the chunk
# filenames are CONTENT-HASHED. Copy over the top of the old folder and the
# previous chunks stay behind while `shell.js` imports the new names, so the
# page 404s on an import of a file nobody touched -- and it fails at RUNTIME,
# in the browser, long after whoever refreshed it has moved on.
#
# ONE folder for TWO entry points, which is the other thing this script
# decides. `shell.js` (the admin screens) and `edit.js` (the script on the
# site's own pages) share most of their graph -- the library, the editor
# element, the markdown parser -- so vendoring them separately would ship
# two copies of ~100 kB and warm two caches for one page. It is also why the
# folder is called `cms` and not `admin`: `edit.js` is downloaded by every
# READER of the site, and a reader fetching something under `/admin/` is a
# reasonable thing for somebody to panic about.
set -euo pipefail

CT="${1:-../ContentTools}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HERE/public/cms"

[ -f "$CT/package.json" ] || { echo "not a ContentTools checkout: $CT" >&2; exit 1; }
CT="$(cd "$CT" && pwd)"

# Build, so what is vendored is what the source says rather than whatever
# happened to be in `dist/` from some earlier experiment.
( cd "$CT" && npm run build >/dev/null )

VERSION="$(node -p "require('$CT/package.json').version")"
SHA="$(git -C "$CT" rev-parse --short HEAD)"

# Start from empty. See above -- this line is the point of the script.
rm -rf "$DEST"
mkdir -p "$DEST/chunks"
cp "$CT/dist/shell.js" "$CT/dist/edit.js" "$DEST/"
cp "$CT/dist/chunks/"*.js "$DEST/chunks/"

# `dist/edit.js` links this itself, at a URL worked out from its OWN
# location -- it is the only file on this side of the lazy import that knows
# where the folder is. Minified because it is served to a browser as-is.
cp "$CT/dist/content-tools-content.min.css" "$DEST/"

# That sheet references six assets under `./images/` -- the icon font and the
# drop-indicator/video SVGs -- so shipping it without them is six 404s. The
# icon font is the one that fails INVISIBLY: the page looks right, but the
# face registers in `error` state, the editor sees a face named `icon`
# already there and skips its own data-URI fallback, and every tool in the
# toolbox renders as a tofu box.
cp -R "$CT/dist/images" "$DEST/"

# The admin page itself is generated, so the version it records cannot drift
# from the bytes beside it.
mkdir -p "$HERE/public/admin"
sed -e "s/@@VERSION@@/$VERSION/" -e "s/@@SHA@@/$SHA/" \
    "$HERE/scripts/admin.html.in" > "$HERE/public/admin/index.html"

echo "vendored ContentTools $VERSION ($SHA) into public/cms/"
