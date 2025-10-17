#!/usr/bin/env python3
"""
File: mcp-server/test_server.py

AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
Website: https://agentvibes.org
Repository: https://github.com/paulpreibisch/AgentVibes

Co-created by Paul Preibisch with Claude AI
Copyright (c) 2025 Paul Preibisch

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
express or implied, including but not limited to the warranties of
merchantability, fitness for a particular purpose and noninfringement.
In no event shall the authors or copyright holders be liable for any claim,
damages or other liability, whether in an action of contract, tort or
otherwise, arising from, out of or in connection with the software or the
use or other dealings in the software.

---

@fileoverview Test suite for AgentVibes MCP Server
@context Validates that MCP server can be imported and initialized correctly
@architecture Unit tests for server initialization, imports, and helper methods
@dependencies mcp-server/server.py, Python unittest framework
@entrypoints Run directly via `python test_server.py` or from test runners
@patterns Test-driven validation, import testing, path resolution testing
@related mcp-server/server.py, docs/ai-optimized-documentation-standards.md
"""

import sys
from pathlib import Path

# Add the mcp-server directory to path
sys.path.insert(0, str(Path(__file__).parent))


def test_imports():
    """Test that all required modules can be imported"""
    print("Testing imports...")
    try:
        from server import AgentVibesServer, app
        print("✅ Server imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        print("   Note: MCP library may not be installed")
        print("   Run: pip install mcp")
        return False


def test_server_init():
    """Test that the server can be initialized"""
    print("\nTesting server initialization...")
    try:
        from server import AgentVibesServer

        server = AgentVibesServer()
        print(f"✅ Server initialized")
        print(f"   Claude dir: {server.claude_dir}")
        print(f"   Hooks dir: {server.hooks_dir}")

        # Check if hooks directory exists
        if server.hooks_dir.exists():
            print(f"✅ Hooks directory found")
        else:
            print(f"⚠️  Hooks directory not found (expected for testing)")

        return True
    except Exception as e:
        print(f"❌ Server init failed: {e}")
        return False


def test_helper_methods():
    """Test helper methods"""
    print("\nTesting helper methods...")
    try:
        from server import AgentVibesServer

        server = AgentVibesServer()

        # Test _find_claude_dir
        claude_dir = server._find_claude_dir()
        print(f"✅ Found claude directory: {claude_dir}")

        return True
    except Exception as e:
        print(f"❌ Helper method test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("AgentVibes MCP Server Test Suite")
    print("=" * 60)

    tests = [
        ("Imports", test_imports),
        ("Server Initialization", test_server_init),
        ("Helper Methods", test_helper_methods),
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            results.append((name, False))

    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")

    print("=" * 60)
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        print("\nNote: Some failures may be expected if MCP library is not installed")
        print("Install with: pip install mcp")
        return 1


if __name__ == "__main__":
    sys.exit(main())
