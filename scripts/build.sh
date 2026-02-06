#!/usr/bin/env bash
# ==============================================================================
# DCYFR AI Docker - Build Script
# ==============================================================================
# Builds Docker images for development or production.
#
# Usage:
#   ./scripts/build.sh              # Build production image
#   ./scripts/build.sh --dev        # Build development image
#   ./scripts/build.sh --tag v1.0   # Build with custom tag
#   ./scripts/build.sh --no-cache   # Build without cache
# ==============================================================================

set -euo pipefail

# Defaults
IMAGE_NAME="${APP_NAME:-dcyfr-ai-app}"
TAG="${TAG:-latest}"
DOCKERFILE="Dockerfile"
BUILD_ARGS=""
NO_CACHE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dev)
      DOCKERFILE="Dockerfile.dev"
      TAG="dev"
      shift
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --no-cache)
      NO_CACHE="--no-cache"
      shift
      ;;
    --platform)
      BUILD_ARGS="$BUILD_ARGS --platform $2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dev] [--tag TAG] [--no-cache] [--platform PLATFORM]"
      exit 1
      ;;
  esac
done

echo "🐳 Building Docker image..."
echo "   Image:      ${IMAGE_NAME}:${TAG}"
echo "   Dockerfile: ${DOCKERFILE}"
echo ""

# Build
docker build \
  -f "${DOCKERFILE}" \
  -t "${IMAGE_NAME}:${TAG}" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "org.opencontainers.image.version=${TAG}" \
  ${NO_CACHE} \
  ${BUILD_ARGS} \
  .

# Show image info
echo ""
echo "✅ Build complete!"
docker images "${IMAGE_NAME}:${TAG}" --format "   Size: {{.Size}}"
echo ""
