#!/usr/bin/env python3
"""Offline MCP tool-metadata preflight using Microsoft's AGT scanner.

Accepts a saved tools/list response (or a bare tools array). It never starts
an MCP server, connects to a transport, invokes a tool, or calls a model.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from typing import Any

PINNED_PACKAGE = "agent-governance-toolkit-core"
PINNED_VERSION = "5.0.0"
MAX_INPUT_BYTES = 4 * 1024 * 1024
MAX_TOOLS = 4096
MAX_TOOL_NAME_CHARS = 256
MAX_DESCRIPTION_CHARS = 32_768
SERVER_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]{1,100}$")


class InputError(ValueError):
    """Raised when supplied JSON is ambiguous, malformed, or oversized."""


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise InputError("JSON contains a duplicate object key")
        result[key] = value
    return result


def reject_non_json_constant(value: str) -> None:
    raise InputError(f"JSON contains a non-standard constant: {value}")


def read_document(source: str) -> tuple[bytes, list[dict[str, Any]]]:
    try:
        if source == "-":
            raw = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
        else:
            with Path(source).open("rb") as input_file:
                raw = input_file.read(MAX_INPUT_BYTES + 1)
    except OSError as exc:
        raise InputError(f"Cannot read input: {exc.__class__.__name__}") from None

    if not raw:
        raise InputError("Input is empty")
    if len(raw) > MAX_INPUT_BYTES:
        raise InputError(f"Input exceeds the {MAX_INPUT_BYTES}-byte limit")
    try:
        document = json.loads(
            raw.decode("utf-8", errors="strict"),
            object_pairs_hook=reject_duplicate_keys,
            parse_constant=reject_non_json_constant,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InputError(f"Input is not valid UTF-8 JSON: {exc.__class__.__name__}") from None

    if isinstance(document, list):
        tools = document
    elif isinstance(document, dict) and isinstance(document.get("tools"), list):
        tools = document["tools"]
    elif (
        isinstance(document, dict)
        and isinstance(document.get("result"), dict)
        and isinstance(document["result"].get("tools"), list)
    ):
        tools = document["result"]["tools"]
    else:
        raise InputError("Expected a tools array or a tools/list JSON-RPC result")

    if len(tools) > MAX_TOOLS:
        raise InputError(f"Tool count exceeds the {MAX_TOOLS}-tool limit")

    normalized: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for index, tool in enumerate(tools):
        if not isinstance(tool, dict):
            raise InputError(f"Tool at index {index} must be a JSON object")
        name = tool.get("name")
        description = tool.get("description", "")
        schema = tool.get("inputSchema")
        if not isinstance(name, str) or not name or len(name) > MAX_TOOL_NAME_CHARS:
            raise InputError(f"Tool at index {index} has an invalid name")
        if name != name.strip() or name in seen_names:
            raise InputError(f"Tool name at index {index} is duplicated or has surrounding whitespace")
        if not isinstance(description, str) or len(description) > MAX_DESCRIPTION_CHARS:
            raise InputError(f"Tool {name!r} has an invalid or oversized description")
        if schema is not None and not isinstance(schema, dict):
            raise InputError(f"Tool {name!r} inputSchema must be a JSON object")
        try:
            name.encode("utf-8", errors="strict")
            description.encode("utf-8", errors="strict")
        except UnicodeEncodeError:
            raise InputError(f"Tool {name!r} contains invalid Unicode") from None

        item: dict[str, Any] = dict(tool)
        item["name"] = name
        item["description"] = description
        if schema is None:
            item.pop("inputSchema", None)
        normalized.append(item)
        seen_names.add(name)

    return raw, normalized


def _tool_metadata_signature(tool: dict[str, Any]) -> str:
    metadata = {key: value for key, value in tool.items() if key != "name"}
    return json.dumps(metadata, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def compare_tool_catalogs(
    baseline_tools: list[dict[str, Any]], current_tools: list[dict[str, Any]]
) -> dict[str, list[str]]:
    baseline = {tool["name"]: _tool_metadata_signature(tool) for tool in baseline_tools}
    current = {tool["name"]: _tool_metadata_signature(tool) for tool in current_tools}
    baseline_names = set(baseline)
    current_names = set(current)
    return {
        "newTools": sorted(current_names - baseline_names),
        "removedTools": sorted(baseline_names - current_names),
        "changedTools": sorted(
            name for name in baseline_names & current_names if baseline[name] != current[name]
        ),
    }


def threat_to_json(threat: Any) -> dict[str, str]:
    # Do not copy tool descriptions, schemas, matched text, or scanner details
    # into the report. Findings expose only identifiers and classification.
    return {
        "toolName": str(threat.tool_name),
        "threatType": str(getattr(threat.threat_type, "value", threat.threat_type)),
        "severity": str(getattr(threat.severity, "value", threat.severity)),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scan saved MCP tool metadata locally with the pinned Microsoft AGT scanner."
    )
    parser.add_argument("--input", required=True, help="Saved tools/list JSON file, or - for stdin")
    parser.add_argument("--baseline", help="Previously reviewed tools/list JSON file for drift comparison")
    parser.add_argument("--server-name", required=True, help="Stable local identifier for this MCP server")
    parser.add_argument("--output", help="Create a new JSON report file; existing files are never overwritten")
    parser.add_argument(
        "--fail-on", choices=("none", "warning", "critical"), default="critical",
        help="Exit with code 2 when findings reach this level (default: critical)",
    )
    args = parser.parse_args()
    if not SERVER_NAME_PATTERN.fullmatch(args.server_name):
        parser.error("--server-name must match [A-Za-z0-9_.:-]{1,100}")
    return args


def main() -> int:
    args = parse_args()
    try:
        installed_version = version(PINNED_PACKAGE)
    except PackageNotFoundError:
        print(
            f"Install the optional scanner in its own environment with: "
            f"python -m pip install -r requirements-agt.txt",
            file=sys.stderr,
        )
        return 1
    if installed_version != PINNED_VERSION:
        print(
            f"Expected {PINNED_PACKAGE}=={PINNED_VERSION}; found {installed_version}",
            file=sys.stderr,
        )
        return 1

    try:
        from agent_os.mcp_security import MCPSecurityConfig, MCPSecurityScanner

        current_raw, current_tools = read_document(args.input)
        baseline_raw: bytes | None = None
        baseline_tools: list[dict[str, Any]] = []
        if args.baseline:
            baseline_raw, baseline_tools = read_document(args.baseline)

        scanner = MCPSecurityScanner(config=MCPSecurityConfig())
        for tool in baseline_tools:
            scanner.register_tool(
                tool["name"], tool["description"], tool.get("inputSchema"), args.server_name
            )
        scanner_tools = [
            {
                "name": tool["name"],
                "description": tool["description"],
                **({"inputSchema": tool["inputSchema"]} if "inputSchema" in tool else {}),
            }
            for tool in current_tools
        ]
        result = scanner.scan_server(args.server_name, scanner_tools)
        findings = [threat_to_json(item) for item in result.threats]
        catalog_changes = compare_tool_catalogs(baseline_tools, current_tools) if args.baseline else None
        catalog_drift = bool(args.baseline and any(catalog_changes.values()))
        report = {
            "schemaVersion": 1,
            "scanner": {
                "name": "Microsoft Agent Governance Toolkit MCPSecurityScanner",
                "package": PINNED_PACKAGE,
                "version": installed_version,
                "ruleset": "upstream built-in sample rules; advisory only",
                "publicPreview": True,
            },
            "serverName": args.server_name,
            "inputs": {
                "currentSha256": hashlib.sha256(current_raw).hexdigest(),
                "baselineSha256": hashlib.sha256(baseline_raw).hexdigest() if baseline_raw else None,
            },
            "scan": {
                "upstreamReportedSafe": bool(result.safe),
                "toolsScanned": int(result.tools_scanned),
                "toolsFlagged": int(result.tools_flagged),
                "findings": findings,
            },
            "assessment": "review_required" if not result.safe or catalog_drift else "no_findings",
            "catalogChanges": (
                {"baselineCompared": True, **catalog_changes, "reviewRequired": catalog_drift}
                if args.baseline else {
                    "baselineCompared": False,
                    "newTools": None,
                    "removedTools": None,
                    "changedTools": None,
                    "reviewRequired": None,
                }
            ),
            "execution": {
                "mode": "saved-json-only",
                "mcpServerLaunched": False,
                "networkUsed": False,
                "toolsInvoked": False,
                "modelApiCalled": False,
            },
            "limitations": [
                "A clean result does not prove a tool is safe; upstream describes the built-in rules as samples.",
                "This is a metadata preflight only and does not enforce Agent Canary runtime policy.",
                "Only one server catalog is compared per invocation; baseline provenance must be reviewed separately.",
            ],
        }
    except InputError as exc:
        print(f"agt-mcp-scan: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"agt-mcp-scan: scan failed ({exc.__class__.__name__})", file=sys.stderr)
        return 1

    serialized = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    try:
        if args.output:
            with Path(args.output).open("x", encoding="utf-8", newline="\n") as output:
                output.write(serialized)
        else:
            sys.stdout.write(serialized)
    except OSError as exc:
        print(f"agt-mcp-scan: cannot write report ({exc.__class__.__name__})", file=sys.stderr)
        return 1

    if args.fail_on == "none":
        return 0
    severities = {item["severity"].lower() for item in findings}
    if "critical" in severities or (args.fail_on == "warning" and "warning" in severities):
        return 2
    if args.fail_on == "warning" and catalog_drift:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
