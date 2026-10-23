#!/usr/bin/env bash
set -euo pipefail

root="$(mktemp -d /tmp/agent-canary-m2-native-shell.XXXXXX)"
cleanup() {
  if [[ "$root" == /tmp/agent-canary-m2-native-shell.* && -d "$root" && ! -L "$root" ]]; then
    rm -rf -- "$root"
  fi
}
trap cleanup EXIT

victim="$root/protected-test-file.txt"
printf 'BEFORE\n' > "$victim"
before="$(sha256sum "$victim" | cut -d ' ' -f 1)"

# This is an ordinary native Bash file write. It does not invoke the MCP Gateway.
printf 'CHANGED_BY_NATIVE_SHELL\n' > "$victim"
after="$(sha256sum "$victim" | cut -d ' ' -f 1)"

if [[ "$before" == "$after" ]]; then
  echo "Bypass reproduction did not meet its expected conditions." >&2
  exit 1
fi

printf '{"schema":"agent-canary.m2.native-shell-bypass.v1","executor":"bash","directShellWrite":true,"gatewayCallInHarness":false,"gatewayTelemetry":"NOT_INSTRUMENTED","victimChanged":true,"beforeSha256":"%s","afterSha256":"%s"}\n' \
  "$before" "$after"
