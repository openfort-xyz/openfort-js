#!/usr/bin/env python3
"""
Extract OpenAPI spec from Better Auth reference page
"""

import sys
import re

html = sys.stdin.read()
match = re.search(
    r'<script[^>]*id="api-reference"[^>]*type="application/json">\s*(.*?)\s*</script>',
    html,
    re.DOTALL
)

if match:
    print(match.group(1))
else:
    sys.stderr.write("Error: Could not find OpenAPI spec in HTML\n")
    sys.exit(1)
