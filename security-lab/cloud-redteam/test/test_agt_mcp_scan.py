import importlib.util
import json
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "agt-mcp-scan.py"
SPEC = importlib.util.spec_from_file_location("agt_mcp_scan", SCRIPT)
AGT_MCP_SCAN = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
SPEC.loader.exec_module(AGT_MCP_SCAN)


class CompareToolCatalogsTests(unittest.TestCase):
    def test_description_change_is_reported_without_copying_content(self):
        baseline = [{"name": "lookup", "description": "safe description"}]
        current = [{"name": "lookup", "description": "PRIVATE_DESCRIPTION_DELTA"}]

        changes = AGT_MCP_SCAN.compare_tool_catalogs(baseline, current)

        self.assertEqual(changes["changedTools"], ["lookup"])
        self.assertNotIn("PRIVATE_DESCRIPTION_DELTA", json.dumps(changes))

    def test_schema_change_is_reported_without_copying_schema(self):
        baseline = [{"name": "lookup", "inputSchema": {"properties": {"id": {"type": "string"}}}}]
        current = [{"name": "lookup", "inputSchema": {"properties": {"id": {"type": "string", "x-note": "SCHEMA_PRIVATE"}}}}]

        changes = AGT_MCP_SCAN.compare_tool_catalogs(baseline, current)

        self.assertEqual(changes["changedTools"], ["lookup"])
        self.assertNotIn("SCHEMA_PRIVATE", json.dumps(changes))

    def test_other_metadata_change_is_reported(self):
        baseline = [{"name": "lookup", "annotations": {"readOnlyHint": True}}]
        current = [{"name": "lookup", "annotations": {"readOnlyHint": False}}]

        changes = AGT_MCP_SCAN.compare_tool_catalogs(baseline, current)

        self.assertEqual(changes["changedTools"], ["lookup"])

    def test_object_key_order_does_not_create_false_drift(self):
        baseline = [{"name": "lookup", "description": "same", "inputSchema": {"type": "object", "properties": {"id": {"type": "string"}}}}]
        current = [{"inputSchema": {"properties": {"id": {"type": "string"}}, "type": "object"}, "description": "same", "name": "lookup"}]

        changes = AGT_MCP_SCAN.compare_tool_catalogs(baseline, current)

        self.assertEqual(changes["changedTools"], [])

    def test_additions_removals_and_changes_are_separate(self):
        baseline = [
            {"name": "changed", "description": "before"},
            {"name": "removed", "description": "old"},
        ]
        current = [
            {"name": "changed", "description": "after"},
            {"name": "added", "description": "new"},
        ]

        changes = AGT_MCP_SCAN.compare_tool_catalogs(baseline, current)

        self.assertEqual(changes, {
            "newTools": ["added"],
            "removedTools": ["removed"],
            "changedTools": ["changed"],
        })


if __name__ == "__main__":
    unittest.main()
