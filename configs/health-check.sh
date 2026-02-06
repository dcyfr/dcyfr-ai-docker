#!/usr/bin/env bash
# ==============================================================================
# DCYFR AI Docker - Container Health Check Script
# ==============================================================================
# Used by Docker HEALTHCHECK instruction to verify container is healthy.
# Checks application HTTP endpoint, optional database, and Redis connectivity.
#
# Usage: ./configs/health-check.sh [--full]
# ==============================================================================

set -euo pipefail

PORT="${PORT:-3000}"
HEALTH_URL="http://localhost:${PORT}/health"
FULL_CHECK=false

# Parse arguments
if [[ "${1:-}" == "--full" ]]; then
  FULL_CHECK=true
fi

# Check 1: HTTP health endpoint
if ! wget --no-verbose --tries=1 --spider "${HEALTH_URL}" 2>/dev/null; then
  echo "❌ Health check failed: HTTP endpoint not responding"
  exit 1
fi

echo "✅ HTTP endpoint healthy"

# Full check mode: verify database and Redis
if [[ "${FULL_CHECK}" == true ]]; then
  # Check 2: Database connectivity (if DATABASE_URL is set)
  if [[ -n "${DATABASE_URL:-}" ]]; then
    if command -v pg_isready &>/dev/null; then
      if ! pg_isready -d "${DATABASE_URL}" -t 5 &>/dev/null; then
        echo "❌ Health check failed: Database not responding"
        exit 1
      fi
      echo "✅ Database healthy"
    fi
  fi

  # Check 3: Redis connectivity (if REDIS_URL is set)
  if [[ -n "${REDIS_URL:-}" ]]; then
    if command -v redis-cli &>/dev/null; then
      if ! redis-cli -u "${REDIS_URL}" ping &>/dev/null; then
        echo "❌ Health check failed: Redis not responding"
        exit 1
      fi
      echo "✅ Redis healthy"
    fi
  fi
fi

exit 0
