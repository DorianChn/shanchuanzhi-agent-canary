# Upgrade guide

Development-branch integration is not a user upgrade procedure. Keep exact reviewed source/artifact hashes and owner contracts; see [COMPATIBILITY.md](COMPATIBILITY.md). This documentation merge does not validate installer migration.

## Current source and package boundary

The `v3.0.0` GitHub Release is published but has no attached assets. The `v3.0.0-competition` Release and `v3.0.0-competition-candidate.4` prerelease have separate candidate/community assets; they are not substitutes for the v3.0.0 package. The reviewed v3.0.0 source records do not provide a verified in-place V1.2.7-to-v3.0.0 state migration procedure.

Do not treat a moving branch or candidate archive as the v3.0.0 source snapshot. Keep the current V1 installation and host configuration untouched while evaluating the exact v3.0.0 tag in a separate source checkout and scratch project. Installing the v3.0.0 package globally may replace the existing `agent-canary` command; no side-by-side global package procedure is verified here.

## Before moving from V1 to v3.0.0

1. Record the installed release/package version, full source SHA where available, Node.js version, OS, and host configuration.
2. Preserve the actual configuration, logs, and local evidence files you need using the host's documented backup method. Store copies outside the project and restrict access; do not assume V1 and v3.0.0 use the same state layout.
3. Use the exact v3.0.0 tag or published package. Verify the version and checksum when a published checksum is available; do not use a moving branch as a reproducible upgrade target.
4. Evaluate v3.0.0 in a separate source checkout and scratch project. The project-level Codex helper previews its config change and prints a receipt path when applied.
5. Run the v3.0.0 self-test and compare only documented behavior for that source snapshot. Keep the existing installation and configuration untouched until the migration impact is understood.

## Codex configuration rollback

If you used the v3.0.0 project integration helper, restore with the receipt it printed before uninstalling or moving the CLI:

~~~sh
agent-canary integrate --restore "/absolute/path/to/receipt.json"
~~~

The helper restores only when the whole configuration still matches the installed version. If Codex or another program has edited the file, it stops and preserves the newer edits; review and remove only the Agent Canary table manually. This receipt restores only that project config entry; it does not migrate or restore the CLI package or unrelated application state.

Do not delete the entire .codex/config.toml or restore an old full-file backup over later user changes.

## Future in-place migration guidance

A future release must publish its exact source tag, supported migration steps, state/config compatibility results, artifact hashes, and rollback procedure before this section is replaced with in-place upgrade commands. No automatic V1.2.7-to-v3.0.0 migration is claimed here.
