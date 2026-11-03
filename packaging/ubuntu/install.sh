#!/bin/sh
set -eu
command -v node >/dev/null 2>&1 || { echo '需要 Node.js 20/22（此入口不会静默安装系统依赖）。Requires Node.js 20/22.' >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo '需要系统 Python 3 解压已校验的 ZIP。Requires Python 3.' >&2; exit 1; }
exec node "$(dirname "$0")/install.mjs" "$@"
