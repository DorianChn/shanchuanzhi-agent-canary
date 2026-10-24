# Windows Community verification application

## Platform
Native Windows 11 x64, WinForms.

## Stack
Delegated by the explicit brief: smallest maintainable installer/launcher around existing TypeScript SDK. C# .NET Framework available in Windows11, bundled official Node, NSIS current-user setup.

## Users and workflow
Ordinary Windows users download EXE, install, detect environment, run fixture-only security checks, export redacted JSON/Markdown. Chinese default with English switching.

## Evidence and constraints
Frozen candidate.2 SDK JS must remain unchanged; no production credentials, model downloads, global agent protection or automatic E4 claim. No new services, autoruns, admin requirement, SmartScreen bypass or replacement of old assets.

## Open decisions
Clean VM/new-user and real GUI acceptance depend on environment and user approval; unsigned publisher disclosure required.
