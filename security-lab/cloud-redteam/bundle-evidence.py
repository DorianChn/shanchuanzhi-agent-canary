#!/usr/bin/env python3
"""Create a credential-safe ZIP copy of the local cloud red-team run tree."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path


ASSIGNMENT = re.compile(
    rb"(?i)(\b[A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|SECRET|PASSWORD|BEARER_TOKEN)"
    rb"[A-Z0-9_]*\s*=\s*)(?:\"([^\"\r\n]{16,})\"|'([^'\r\n]{16,})'|"
    rb"([^\s\"'\\,;)}\]]{16,}))"
)
BEARER = re.compile(rb"(?i)(\bBearer\s+)[A-Za-z0-9._~+/-]{16,}")
TOKEN_PREFIX = re.compile(rb"\b(?:sk-(?:proj-|ant-)?|gh[pousr]_|AIza)[A-Za-z0-9_-]{16,}")
ENV_KEY = re.compile(r"^[A-Za-z0-9_]*(?:API_KEY|ACCESS_TOKEN|SECRET|PASSWORD)[A-Za-z0-9_]*\s*=\s*(.*?)\s*$", re.I)
TEXT_SUFFIXES = {
    ".json", ".jsonl", ".log", ".md", ".txt", ".csv", ".yaml", ".yml",
    ".xml", ".html", ".js", ".mjs", ".py", ".toml", ".ini",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def local_credentials(env_path: Path) -> list[bytes]:
    if not env_path.is_file():
        return []
    values: list[bytes] = []
    for line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
        match = ENV_KEY.match(line)
        if not match:
            continue
        value = match.group(1).strip().strip("\"'")
        if len(value) >= 12 and not value.startswith(("${", "{{")):
            values.append(value.encode("utf-8"))
    return values


def sanitize(data: bytes, credentials: list[bytes]) -> tuple[bytes, dict[str, int]]:
    counts = {"assignments": 0, "bearer_values": 0, "token_prefixes": 0, "local_credentials": 0}
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        return data, counts

    def redact_assignment(match: re.Match[bytes]) -> bytes:
        counts["assignments"] += 1
        key_and_equals = match.group(1)
        for group in (2, 3, 4):
            if match.group(group) is not None:
                value = match.group(group)
                if group in (2, 3):
                    quote = b'"' if group == 2 else b"'"
                    return key_and_equals + quote + b"[REDACTED]" + quote
                return key_and_equals + b"[REDACTED]"
        return match.group(0)

    result = ASSIGNMENT.sub(redact_assignment, data)

    def redact_bearer(match: re.Match[bytes]) -> bytes:
        counts["bearer_values"] += 1
        return match.group(1) + b"[REDACTED]"

    result = BEARER.sub(redact_bearer, result)
    result, counts["token_prefixes"] = TOKEN_PREFIX.subn(b"[REDACTED]", result)
    for credential in credentials:
        count = result.count(credential)
        if count:
            counts["local_credentials"] += count
            result = result.replace(credential, b"[REDACTED]")
    return result, counts


def main() -> int:
    here = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=Path, default=here / "runs", help="source runs directory")
    parser.add_argument("--output", type=Path, default=None, help="destination ZIP path")
    parser.add_argument("--env-file", type=Path, default=here / ".env.local", help="local ignored env file used only for exact-value scanning")
    parser.add_argument("--date", default=date.today().isoformat(), help="date label used in the default ZIP name")
    args = parser.parse_args()

    runs = args.runs.resolve()
    output = (args.output or here / f"campaign-evidence-{args.date}.zip").resolve()
    if not runs.is_dir():
        parser.error(f"runs directory does not exist: {runs}")
    if output == runs or runs in output.parents:
        parser.error("output ZIP must be outside the runs directory")

    credentials = local_credentials(args.env_file.resolve())
    files: list[dict[str, object]] = []
    totals = {"assignments": 0, "bearer_values": 0, "token_prefixes": 0, "local_credentials": 0}
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    if temporary.exists():
        temporary.unlink()

    try:
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for source in sorted(runs.rglob("*")):
                if not source.is_file():
                    continue
                relative = source.relative_to(runs)
                if any(part.lower() in {"node_modules", ".git"} for part in relative.parts):
                    continue
                if source.name.lower() == ".env" or source.name.lower().startswith(".env."):
                    continue

                original = source.read_bytes()
                safe = original
                redactions = {key: 0 for key in totals}
                if source.suffix.lower() in TEXT_SUFFIXES:
                    safe, redactions = sanitize(original, credentials)
                for key, value in redactions.items():
                    totals[key] += value
                archive.writestr(f"runs/{relative.as_posix()}", safe)
                files.append({
                    "path": f"runs/{relative.as_posix()}",
                    "source_sha256": sha256(original),
                    "archive_sha256": sha256(safe),
                    "source_bytes": len(original),
                    "archive_bytes": len(safe),
                    "redactions": redactions,
                })

            manifest = {
                "created_at_utc": datetime.now(timezone.utc).isoformat(),
                "source_root": "security-lab/cloud-redteam/runs",
                "method": "Read-only archive copy; source run files are unchanged. Credential assignments, bearer values, known token prefixes, and exact values from the ignored local env file are replaced in UTF-8 text copies.",
                "file_count": len(files),
                "source_bytes": sum(int(item["source_bytes"]) for item in files),
                "archive_bytes_uncompressed": sum(int(item["archive_bytes"]) for item in files),
                "redaction_totals": totals,
                "files": files,
            }
            archive.writestr(
                "evidence-redaction-manifest.json",
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            )

        with zipfile.ZipFile(temporary, "r") as archive:
            bad_member = archive.testzip()
            if bad_member:
                raise RuntimeError(f"ZIP integrity check failed for {bad_member}")
            names = archive.namelist()
            if any(name.lower().endswith(".env.local") or "/node_modules/" in name.lower() for name in names):
                raise RuntimeError("ZIP contains a forbidden environment or dependency path")
            if any(name.lower().endswith(".env") or "/.env." in name.lower() for name in names):
                raise RuntimeError("ZIP contains a forbidden environment file")
            for name in names:
                if name == "evidence-redaction-manifest.json":
                    continue
                data = archive.read(name)
                for credential in credentials:
                    if credential and credential in data:
                        raise RuntimeError(f"local credential remains in archive member {name}")

        temporary.replace(output)
    except Exception:
        if temporary.exists():
            temporary.unlink()
        raise

    print(json.dumps({
        "output": str(output),
        "files": len(files),
        "source_bytes": sum(int(item["source_bytes"]) for item in files),
        "archive_bytes": output.stat().st_size,
        "redaction_totals": totals,
        "sha256": sha256(output.read_bytes()),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
