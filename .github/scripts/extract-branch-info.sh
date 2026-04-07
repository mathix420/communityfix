#!/usr/bin/env bash
# Script: extract-branch-info.sh
# Purpose: Extract PR prefix and formatted feature name from branch name
#
# Usage: extract-branch-info.sh --branch <name>
#
# Parameters:
#   --branch <name>  Branch name to parse (required)
#
# Environment Variables:
#   GITHUB_OUTPUT - Path to GitHub Actions output file (required)
#
# Outputs:
#   Writes to $GITHUB_OUTPUT:
#     branch_name=<branch name>
#     pr_prefix=<feat|fix|chore|docs|changes>
#     feature_name=<Formatted Feature Name>
#
# Exit Codes:
#   0 - Success (always succeeds with defaults)

set -euo pipefail

# Default values
BRANCH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown parameter: $1" >&2
      echo "Usage: extract-branch-info.sh --branch <name>" >&2
      exit 1
      ;;
  esac
done

# Validate required parameters
if [[ -z "$BRANCH" ]]; then
  echo "Error: --branch is required" >&2
  exit 1
fi

# Validate GITHUB_OUTPUT
if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "Error: GITHUB_OUTPUT environment variable is required" >&2
  exit 1
fi

# Extract PR prefix based on branch pattern
if [[ "$BRANCH" == feat/* ]]; then
  PR_PREFIX="feat"
elif [[ "$BRANCH" == fix/* ]]; then
  PR_PREFIX="fix"
elif [[ "$BRANCH" == chore/* ]]; then
  PR_PREFIX="chore"
elif [[ "$BRANCH" == docs/* ]]; then
  PR_PREFIX="docs"
else
  PR_PREFIX="changes"
fi

# Extract and format feature name
# Remove prefix (everything before first slash)
FEATURE_NAME=$(echo "$BRANCH" | sed 's/^[^\/]*\///')
# Replace hyphens with spaces
FEATURE_NAME=$(echo "$FEATURE_NAME" | sed 's/-/ /g')
# Capitalize first letter of each word
FEATURE_NAME=$(echo "$FEATURE_NAME" | sed 's/\b\(.\)/\u\1/g')

# Write to GITHUB_OUTPUT
{
  echo "branch_name=$BRANCH"
  echo "pr_prefix=$PR_PREFIX"
  echo "feature_name=$FEATURE_NAME"
} >> "$GITHUB_OUTPUT"

echo "Success: Extracted branch info for $BRANCH (prefix: $PR_PREFIX)" >&2
exit 0
