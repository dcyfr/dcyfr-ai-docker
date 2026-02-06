#!/usr/bin/env bash
# ==============================================================================
# DCYFR AI Docker - Run Script
# ==============================================================================
# Runs Docker containers for development or production.
#
# Usage:
#   ./scripts/run.sh              # Run development stack
#   ./scripts/run.sh --prod       # Run production stack
#   ./scripts/run.sh --detach     # Run in background
#   ./scripts/run.sh --build      # Rebuild and run
# ==============================================================================

set -euo pipefail

# Defaults
COMPOSE_FILE="docker-compose.yml"
DETACH=""
BUILD=""
EXTRA_ARGS=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod)
      COMPOSE_FILE="docker-compose.prod.yml"
      shift
      ;;
    --detach|-d)
      DETACH="-d"
      shift
      ;;
    --build)
      BUILD="--build"
      shift
      ;;
    --scale)
      EXTRA_ARGS="$EXTRA_ARGS --scale app=$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--prod] [--detach] [--build] [--scale N]"
      exit 1
      ;;
  esac
done

echo "🚀 Starting DCYFR AI Docker stack..."
echo "   Compose: ${COMPOSE_FILE}"
echo ""

# Check for .env file
if [[ ! -f .env ]]; then
  echo "⚠️  No .env file found. Copying from .env.example..."
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "   Created .env from .env.example"
    echo "   Edit .env with your configuration before production use."
  else
    echo "   No .env.example found. Using defaults."
  fi
  echo ""
fi

# Run
docker compose -f "${COMPOSE_FILE}" up ${DETACH} ${BUILD} ${EXTRA_ARGS}

if [[ -n "${DETACH}" ]]; then
  echo ""
  echo "✅ Stack is running in background."
  echo "   Logs:   docker compose -f ${COMPOSE_FILE} logs -f"
  echo "   Stop:   docker compose -f ${COMPOSE_FILE} down"
  echo "   Status: docker compose -f ${COMPOSE_FILE} ps"
fi
