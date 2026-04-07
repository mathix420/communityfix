#!/usr/bin/env bash
# Script: call-claude-api.sh
# Purpose: Call Claude API with prompt and extract response
#
# Usage: call-claude-api.sh --prompt-file <path> --output <file> [OPTIONS]
#
# Parameters:
#   --prompt-file <path>  Path to file containing the prompt text (required)
#   --output <file>       Path to write the response (required)
#   --model <model>       Model to use (optional, default: claude-sonnet-4-20250514)
#   --max-tokens <n>      Maximum tokens to generate (optional, default: 1024)
#   --fallback <text>     Fallback text if API fails (optional)
#
# Environment Variables:
#   ANTHROPIC_API_KEY - Claude API key (required)
#
# Outputs:
#   Writes Claude's response to the specified output file
#
# Exit Codes:
#   0 - Success (including fallback usage)
#   1 - Error (missing parameters or hard failure)

set -euo pipefail

# Default values
PROMPT_FILE=""
OUTPUT=""
MODEL="claude-sonnet-4-20250514"
MAX_TOKENS="1024"
FALLBACK=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prompt-file)
      PROMPT_FILE="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --max-tokens)
      MAX_TOKENS="$2"
      shift 2
      ;;
    --fallback)
      FALLBACK="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown parameter: $1" >&2
      echo "Usage: call-claude-api.sh --prompt-file <path> --output <file> [OPTIONS]" >&2
      exit 1
      ;;
  esac
done

# Validate required parameters
if [[ -z "$PROMPT_FILE" ]]; then
  echo "Error: --prompt-file is required" >&2
  exit 1
fi

if [[ -z "$OUTPUT" ]]; then
  echo "Error: --output is required" >&2
  exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Error: Prompt file not found: $PROMPT_FILE" >&2
  exit 1
fi

# If no API key, fall through to the fallback rather than failing.
# auto-pr.yml must never fail just because Claude is unavailable, so the
# workflow always passes --fallback and we use it here when the key is
# missing.
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "Warning: ANTHROPIC_API_KEY not set — skipping Claude call" >&2
  if [[ -n "$FALLBACK" ]]; then
    echo "Using fallback text" >&2
    echo "$FALLBACK" > "$OUTPUT"
    exit 0
  else
    echo "Error: No API key and no --fallback provided" >&2
    exit 1
  fi
fi

# Read prompt from file
PROMPT=$(cat "$PROMPT_FILE")

# Call Claude API
RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -d "$(jq -n \
    --arg prompt "$PROMPT" \
    --arg model "$MODEL" \
    --argjson max_tokens "$MAX_TOKENS" \
    '{
      "model": $model,
      "max_tokens": $max_tokens,
      "messages": [{"role": "user", "content": $prompt}]
    }')")

# Extract response text
RESPONSE_TEXT=$(echo "$RESPONSE" | jq -r '.content[0].text // empty')

# Check for errors or empty response
if [[ -z "$RESPONSE_TEXT" ]]; then
  ERROR_MESSAGE=$(echo "$RESPONSE" | jq -r '.error.message // "Unknown error"')
  echo "Warning: Claude API returned empty response or error: $ERROR_MESSAGE" >&2

  if [[ -n "$FALLBACK" ]]; then
    echo "Using fallback text" >&2
    echo "$FALLBACK" > "$OUTPUT"
    exit 0
  else
    echo "Error: No response from Claude API and no fallback provided" >&2
    exit 1
  fi
fi

# Write response to output file
echo "$RESPONSE_TEXT" > "$OUTPUT"

echo "Success: Claude API response written to $OUTPUT" >&2
exit 0
