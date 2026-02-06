#!/usr/bin/env bash
# ==============================================================================
# DCYFR AI Docker - Deploy Script
# ==============================================================================
# Builds, tags, and pushes Docker images to a container registry.
#
# Usage:
#   ./scripts/deploy.sh                              # Deploy to default registry
#   ./scripts/deploy.sh --registry ghcr.io/dcyfr     # Deploy to GHCR
#   ./scripts/deploy.sh --tag v1.2.3                 # Deploy with specific tag
#   ./scripts/deploy.sh --dry-run                    # Show what would happen
# ==============================================================================

set -euo pipefail

# Defaults
IMAGE_NAME="${APP_NAME:-dcyfr-ai-app}"
REGISTRY="${REGISTRY:-ghcr.io/dcyfr}"
TAG="${TAG:-latest}"
DRY_RUN=false
PLATFORMS="linux/amd64,linux/arm64"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --registry)
      REGISTRY="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --platform)
      PLATFORMS="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--registry REGISTRY] [--tag TAG] [--dry-run] [--platform PLATFORMS]"
      exit 1
      ;;
  esac
done

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"
FULL_IMAGE_LATEST="${REGISTRY}/${IMAGE_NAME}:latest"

echo "📦 Deploying DCYFR AI Docker image..."
echo "   Image:    ${FULL_IMAGE}"
echo "   Registry: ${REGISTRY}"
echo "   Tag:      ${TAG}"
echo "   Platform: ${PLATFORMS}"
echo ""

if [[ "${DRY_RUN}" == true ]]; then
  echo "🔍 Dry run mode — no changes will be made."
  echo ""
  echo "Would execute:"
  echo "  1. docker build -t ${FULL_IMAGE} ."
  echo "  2. docker tag ${FULL_IMAGE} ${FULL_IMAGE_LATEST}"
  echo "  3. docker push ${FULL_IMAGE}"
  echo "  4. docker push ${FULL_IMAGE_LATEST}"
  exit 0
fi

# Step 1: Build
echo "1/4 Building image..."
docker build \
  -f Dockerfile \
  -t "${FULL_IMAGE}" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "org.opencontainers.image.version=${TAG}" \
  .

# Step 2: Tag as latest
echo "2/4 Tagging as latest..."
docker tag "${FULL_IMAGE}" "${FULL_IMAGE_LATEST}"

# Step 3: Push versioned tag
echo "3/4 Pushing ${FULL_IMAGE}..."
docker push "${FULL_IMAGE}"

# Step 4: Push latest tag
echo "4/4 Pushing ${FULL_IMAGE_LATEST}..."
docker push "${FULL_IMAGE_LATEST}"

echo ""
echo "✅ Deployment complete!"
echo "   Pull: docker pull ${FULL_IMAGE}"
echo ""
