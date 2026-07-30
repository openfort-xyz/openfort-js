#!/bin/bash
set -euo pipefail

# `gitleaks protect` is deprecated as of v8.19; `gitleaks git --staged` replaces
# it. Rules come from .gitleaks.toml, which extends the default ruleset.
if command -v gitleaks >/dev/null 2>&1; then
    gitleaks git --staged --redact -v
elif [[ "$(uname)" == "Linux" ]] && command -v docker >/dev/null 2>&1; then
    # `gitleaks git` takes the repo as a positional argument; `--source` only
    # exists on the deprecated subcommands and fails the commit. The image is
    # pinned to the version CI uses rather than `latest`, and the container's
    # git needs the bind-mounted repo marked safe: it runs as root while the
    # mount is owned by the host user.
    docker run --rm -v "$(pwd)":/path \
        -e GIT_CONFIG_COUNT=1 \
        -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0=/path \
        ghcr.io/gitleaks/gitleaks:v8.30.1 \
        git --staged --redact -v /path
else
    echo "gitleaks is not installed and no Docker fallback is available."
    echo "Install it: https://github.com/gitleaks/gitleaks#installing"
    exit 1
fi
