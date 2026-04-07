#!/usr/bin/env bash
# Script: collect-git-changes.sh
# Purpose: Collect git commits, diff stats, and optionally diff content between two refs
#
# Usage: collect-git-changes.sh --base <ref> --output-commits <file> --output-diff-stat <file> [OPTIONS]
#
# Parameters:
#   --base <ref>                 Base ref (required, e.g., master, staging, origin/master)
#   --head <ref>                 Head ref (optional, default: HEAD)
#   --output-commits <file>      Path to write commit messages (required)
#   --output-diff-stat <file>    Path to write diff statistics (required)
#   --output-diff-content <file> Path to write diff content (optional)
#   --diff-content-limit <bytes> Limit diff content to N bytes (optional, requires --output-diff-content)
#   --allow-empty                Don't fail if refs are the same or no changes (optional)
#
# Outputs:
#   Creates specified files with git data
#
# Exit Codes:
#   0 - Success
#   1 - Error (missing refs, invalid refs, or no changes without --allow-empty)

set -euo pipefail

# Default values
BASE=""
HEAD="HEAD"
OUTPUT_COMMITS=""
OUTPUT_DIFF_STAT=""
OUTPUT_DIFF_CONTENT=""
DIFF_CONTENT_LIMIT=""
ALLOW_EMPTY="false"

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
    --output-commits)
      OUTPUT_COMMITS="$2"
      shift 2
      ;;
    --output-diff-stat)
      OUTPUT_DIFF_STAT="$2"
      shift 2
      ;;
    --output-diff-content)
      OUTPUT_DIFF_CONTENT="$2"
      shift 2
      ;;
    --diff-content-limit)
      DIFF_CONTENT_LIMIT="$2"
      shift 2
      ;;
    --allow-empty)
      ALLOW_EMPTY="true"
      shift
      ;;
    *)
      echo "Error: Unknown parameter: $1" >&2
      echo "Usage: collect-git-changes.sh --base <ref> --output-commits <file> --output-diff-stat <file> [OPTIONS]" >&2
      exit 1
      ;;
  esac
done

# Validate required parameters
if [[ -z "$BASE" ]]; then
  echo "Error: --base is required" >&2
  exit 1
fi

if [[ -z "$OUTPUT_COMMITS" ]]; then
  echo "Error: --output-commits is required" >&2
  exit 1
fi

if [[ -z "$OUTPUT_DIFF_STAT" ]]; then
  echo "Error: --output-diff-stat is required" >&2
  exit 1
fi

# Validate refs exist
if ! git cat-file -e "$BASE" 2>/dev/null; then
  if [[ "$ALLOW_EMPTY" == "true" ]]; then
    echo "Warning: Base ref '$BASE' not found, using empty output" >&2
    echo "Initial commit" > "$OUTPUT_COMMITS"
    echo "New branch" > "$OUTPUT_DIFF_STAT"
    [[ -n "$OUTPUT_DIFF_CONTENT" ]] && echo "" > "$OUTPUT_DIFF_CONTENT"
    exit 0
  else
    echo "Error: Base ref not found: $BASE" >&2
    exit 1
  fi
fi

if ! git cat-file -e "$HEAD" 2>/dev/null; then
  echo "Error: Head ref not found: $HEAD" >&2
  exit 1
fi

# Collect git log (commits)
if ! git log "${BASE}..${HEAD}" --pretty=format:"%s" --no-merges > "$OUTPUT_COMMITS" 2>/dev/null; then
  if [[ "$ALLOW_EMPTY" == "true" ]]; then
    echo "Initial commit" > "$OUTPUT_COMMITS"
  else
    echo "Error: Failed to collect commits" >&2
    exit 1
  fi
fi

# Handle empty commits file
if [[ ! -s "$OUTPUT_COMMITS" ]]; then
  if [[ "$ALLOW_EMPTY" == "true" ]]; then
    echo "Initial commit" > "$OUTPUT_COMMITS"
  fi
fi

# Collect diff statistics
if ! git diff --stat "${BASE}..${HEAD}" > "$OUTPUT_DIFF_STAT" 2>/dev/null; then
  if [[ "$ALLOW_EMPTY" == "true" ]]; then
    echo "New branch" > "$OUTPUT_DIFF_STAT"
  else
    echo "Error: Failed to collect diff statistics" >&2
    exit 1
  fi
fi

# Handle empty diff stat file
if [[ ! -s "$OUTPUT_DIFF_STAT" ]]; then
  if [[ "$ALLOW_EMPTY" == "true" ]]; then
    echo "New branch" > "$OUTPUT_DIFF_STAT"
  fi
fi

# Collect diff content if requested
if [[ -n "$OUTPUT_DIFF_CONTENT" ]]; then
  if [[ -n "$DIFF_CONTENT_LIMIT" ]]; then
    # Disable pipefail temporarily to handle SIGPIPE from head gracefully
    set +o pipefail
    git diff "${BASE}..${HEAD}" 2>/dev/null | head -c "$DIFF_CONTENT_LIMIT" > "$OUTPUT_DIFF_CONTENT"
    DIFF_EXIT=$?
    set -o pipefail
    # head returns 0 on success, git diff might return 141 (SIGPIPE) which is ok
    if [[ $DIFF_EXIT -ne 0 && $DIFF_EXIT -ne 141 ]]; then
      if [[ "$ALLOW_EMPTY" == "true" ]]; then
        echo "" > "$OUTPUT_DIFF_CONTENT"
      else
        echo "Error: Failed to collect diff content" >&2
        exit 1
      fi
    fi
  else
    if ! git diff "${BASE}..${HEAD}" > "$OUTPUT_DIFF_CONTENT" 2>/dev/null; then
      if [[ "$ALLOW_EMPTY" == "true" ]]; then
        echo "" > "$OUTPUT_DIFF_CONTENT"
      else
        echo "Error: Failed to collect diff content" >&2
        exit 1
      fi
    fi
  fi
fi

echo "Success: Git changes collected from $BASE to $HEAD" >&2
exit 0
