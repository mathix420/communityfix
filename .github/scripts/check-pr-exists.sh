#!/usr/bin/env bash
# Script: check-pr-exists.sh
# Purpose: Check if PR exists between two branches
#
# Usage: check-pr-exists.sh --base <branch> --head <branch> [OPTIONS]
#
# Parameters:
#   --base <branch>        Base branch (required)
#   --head <branch>        Head branch (required)
#   --state <state>        PR state: open, closed, all (optional, default: open)
#
# Environment Variables:
#   GITHUB_TOKEN - GitHub token for authentication (required)
#   GITHUB_OUTPUT - Path to GitHub Actions output file (required)
#
# Outputs:
#   Writes to $GITHUB_OUTPUT:
#     result=<count of PRs found>
#
# Exit Codes:
#   0 - Success (always succeeds, check output for results)
#   1 - Error (missing parameters or gh command failure)

set -euo pipefail

# Default values
BASE=""
HEAD=""
STATE="open"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --base)
      BASE="$2"
      shift 2
      ;;
    --head)
      HEAD="$2"
      shift 2
      ;;
    --state)
      STATE="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown parameter: $1" >&2
      echo "Usage: check-pr-exists.sh --base <branch> --head <branch> [OPTIONS]" >&2
      exit 1
      ;;
  esac
done

# Validate required parameters
if [[ -z "$BASE" ]]; then
  echo "Error: --base is required" >&2
  exit 1
fi

if [[ -z "$HEAD" ]]; then
  echo "Error: --head is required" >&2
  exit 1
fi

# Validate state parameter
if [[ "$STATE" != "open" && "$STATE" != "closed" && "$STATE" != "all" ]]; then
  echo "Error: --state must be one of: open, closed, all" >&2
  exit 1
fi

# Validate GITHUB_TOKEN
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Error: GITHUB_TOKEN environment variable is required" >&2
  exit 1
fi

# Validate GITHUB_OUTPUT
if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "Error: GITHUB_OUTPUT environment variable is required" >&2
  exit 1
fi

# Check for existing PR using gh CLI
PR_COUNT=$(gh pr list --base "$BASE" --head "$HEAD" --state "$STATE" --json number --jq '. | length' 2>/dev/null || echo "0")

# Write result to GITHUB_OUTPUT
echo "result=$PR_COUNT" >> "$GITHUB_OUTPUT"

if [[ "$PR_COUNT" == "0" ]]; then
  echo "No $STATE PR found from $HEAD to $BASE" >&2
else
  echo "Found $PR_COUNT $STATE PR(s) from $HEAD to $BASE" >&2
fi

exit 0
