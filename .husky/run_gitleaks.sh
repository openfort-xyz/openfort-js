#!/bin/bash
set -euo pipefail

# `gitleaks protect` is deprecated as of v8.19; `gitleaks git --staged` replaces
# it. Rules come from .gitleaks.toml, which extends the default ruleset.
if command -v gitleaks >/dev/null 2>&1; then
    gitleaks git --staged --redact -v
elif [[ "$(uname)" == "Linux" ]] && command -v docker >/dev/null 2>&1; then
    docker run --rm -v "$(pwd)":/path ghcr.io/gitleaks/gitleaks:latest \
        git --source="/path" --staged --redact -v
else
    echo "gitleaks is not installed and no Docker fallback is available."
    echo "Install it: https://github.com/gitleaks/gitleaks#installing"
    exit 1
fi
