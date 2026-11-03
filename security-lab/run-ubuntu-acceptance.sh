#!/bin/sh
set -eu
task_repo=$1
task_zip=$2
task_sha=$3
task_node=$4
task_out=$5
export PATH="$task_node/bin:/usr/bin:/bin"
task_root=$(mktemp -d /tmp/shanchuanzhi-canary-ubuntu-XXXXXX)
printf '%s\n' "$task_root" > "$task_out/ubuntu-sandbox.txt"
export AGENT_CANARY_HOME="$task_root/state"
export NPM_CONFIG_USERCONFIG="$task_root/empty-npmrc"
export NPM_CONFIG_GLOBALCONFIG="$task_root/empty-global-npmrc"
: > "$NPM_CONFIG_USERCONFIG"
: > "$NPM_CONFIG_GLOBALCONFIG"
sh "$task_repo/packaging/ubuntu/install.sh" install "$task_zip" "$task_sha" "$task_root/installed" > "$task_out/ubuntu-install.log" 2> "$task_out/ubuntu-install.err"
"$task_root/installed/agent-canary-community" --version > "$task_out/ubuntu-version.txt"
"$task_root/installed/agent-canary-community" build-info > "$task_out/ubuntu-build-info.json"
"$task_root/installed/agent-canary-community" doctor > "$task_out/ubuntu-doctor.json"
node "$task_root/installed/reproduction-kit/run-offline-demo.mjs" --root="$task_root/installed" > "$task_out/ubuntu-side-effects.json"
node "$task_repo/scripts/check-sdk-types.mjs" --package-root "$task_root/installed" > "$task_out/ubuntu-types.json"
printf 'UNKNOWN_USER_FILE_KEEP\n' > "$task_root/installed/keep-user.txt"
sh "$task_repo/packaging/ubuntu/install.sh" uninstall unused unused "$task_root/installed" > "$task_out/ubuntu-uninstall.json"
test "$(cat "$task_root/installed/keep-user.txt")" = UNKNOWN_USER_FILE_KEEP
test ! -e "$task_root/installed/dist/competition.js"
sh "$task_repo/packaging/ubuntu/install.sh" uninstall unused unused "$task_root/installed" > "$task_out/ubuntu-uninstall-repeat.json"
printf 'PASS\n' > "$task_out/ubuntu-acceptance-status.txt"
