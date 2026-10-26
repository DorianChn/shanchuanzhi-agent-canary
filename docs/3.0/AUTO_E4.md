# Auto E4: one-click bounded acceptance

## Status and scope

The Windows Community desktop candidate includes an **Auto E4 / 自动 E4** action. It coordinates checks from the installed payload, streams stage status to the UI, prevents concurrent runs, and writes a run-specific JSON report, Markdown report, event log, evidence index, and ZIP bundle with a SHA-256 sidecar.

This is an author-operated acceptance runner, not an E4 certifier. It always reports **E4 EXTERNAL INDEPENDENCE NOT VERIFIED** until a different real operator performs and signs off an independent run. A claimed role or machine identity does not establish independence.

## What a run actually does

The fixed stages are `environment`, `clean-vm`, `release-package`, `sdk-side-effects`, `gpt6-agent`, `hook-failures`, `evidence-review`, `uninstall-reinstall`, `github-pr`, and `materials`.

- Environment inspection records OS/architecture/Node and whether VMware's `vmrun` or a Codex CLI executable is present. Finding a CLI executable does **not** establish the active model identity or make a model call.
- VMware inspection is read-only: it lists running VMs and snapshots for an explicitly configured VMX. It does not create, restore, or delete snapshots; start a guest; install software; or execute guest operations. Without an existing, reviewed disposable VM and guest transport, guest-dependent stages are `BLOCKED`.
- Release inspection reads the public GitHub Release metadata for the installed candidate and compares its published SHA-256 digest with the local installer receipt, when both are available. A local hash is not a publisher signature.
- The SDK fixture makes actual writes in temporary synthetic files and checks callback execution, a loopback-only receiver, file hashes, and the SDK evidence chain. It is operator-triggered I/O, not an LLM attack.
- The hook fault fixture launches the packaged hook wrapper in subprocesses and checks its synthetic callback fixture. It is not a live Codex/Claude/Cursor hook or VM failure test.
- GPT-6 invocation, VM installer lifecycle, GitHub PR updates, and competition submission are **not** performed by the packaged runner unless their separate, safe prerequisites are implemented and verified. Current runner reports missing prerequisites as `BLOCKED`; it makes no model API call and has no GitHub write credential.
- The materials stage creates a run evidence bundle, not a complete competition submission package.

## Run and export

Install the Windows Community candidate and click **自动 E4** once. While it runs, the controls are disabled and each stage reports `RUNNING`, `PASS`, `FAIL`, `BLOCKED`, `SKIPPED`, or `NOT_VERIFIED`. After completion, use **打开最终报告** to inspect the local Markdown report. Use **导出复现报告** only when you want the existing redacted JSON/Markdown export flow.

The evidence bundle is saved under the application's local data directory in `auto-e4-runs/<run-id>/`. It contains the run report, event log, and index; a `.sha256` sidecar accompanies the ZIP. Review the report before sharing it. Do not treat `DENY` alone as proof of no side effect; check the recorded before/after hashes and receiver count.

## Safe VM setup boundary

The runner accepts an explicit local configuration at `<AppData>/e4-config.json`, for example:

```json
{
  "vmxPath": "D:\\\\DisposableVM\\\\Windows11.vmx",
  "snapshotName": "clean-baseline",
  "dedicatedDisposableVmConfirmed": true
}
```

The runner only validates and inspects that target; it does not act on it. Do not point it at a VM containing personal or production data. Guest execution, snapshot restoration, GPT-6 tool transport, and lifecycle acceptance remain blocked until implemented with an explicit, auditable guest channel and reviewed disposable-VM procedure.

## Reproducible checks

From the source checkout, run:

```bash
npm test -- --test-name-pattern="Auto E4|Windows launcher"
npm run verify
```

The Windows candidate installer must be rebuilt from the reviewed source before users can see the button. Existing public Release assets are immutable evidence and are not replaced by this source change.
