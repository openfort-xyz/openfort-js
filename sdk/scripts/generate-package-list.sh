#!/bin/sh

set -e

pnpm -r list --json --depth -1 > workspace-packages.json