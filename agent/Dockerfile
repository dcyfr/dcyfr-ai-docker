# DCYFR Autonomous Agent Container Image
#
# Multi-stage build for the DCYFR agent execution environment.
# Agents run as non-root (UID 1001), with network restricted to
# github.com + registry.npmjs.org at runtime via external Docker network policy.
#
# Build: docker build -t dcyfr/agent:latest -f agent/Dockerfile .
# Test:  docker run --rm dcyfr/agent:latest --version

# ── Stage 1: Dependency installer ─────────────────────────────────────────────
FROM node:22-slim AS deps

WORKDIR /install

# Install OS-level build tools for native addons (node-gyp)
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Agent runtime image ──────────────────────────────────────────────
FROM node:22-slim AS runtime

# Metadata
LABEL org.opencontainers.image.title="DCYFR Agent"
LABEL org.opencontainers.image.description="Autonomous agent execution environment for DCYFR workspace"
LABEL org.opencontainers.image.vendor="DCYFR"
LABEL org.opencontainers.image.source="https://github.com/dcyfr/workspace"

# ------------------------------------------------------------------
# Install runtime tools
#   git        — clone repositories
#   gh         — GitHub CLI for PR creation
#   jq         — JSON parsing in entrypoint/scripts
#   curl       — health checks / package downloads
#   ca-certs   — HTTPS root certificates
# ------------------------------------------------------------------
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    git \
    jq \
    curl \
    ca-certificates \
    && \
    # Install GitHub CLI (official Debian repo)
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends gh && \
    # Clean up
    rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------------
# Non-root user: agent (UID/GID 1001)
# Mirrors the convention used in dcyfr-ai-docker/Dockerfile (dcyfr:nodejs).
# ------------------------------------------------------------------
RUN groupadd --gid 1001 agent && \
    useradd --uid 1001 --gid 1001 --shell /bin/bash --create-home agent

# ------------------------------------------------------------------
# Workspace directory — agent clones the target repo here at runtime
# ------------------------------------------------------------------
RUN mkdir -p /workspace && chown agent:agent /workspace

# ------------------------------------------------------------------
# Copy and install the agent entrypoint script
# ------------------------------------------------------------------
COPY --chown=agent:agent agent/agent-entrypoint.sh /usr/local/bin/agent-entrypoint
RUN chmod +x /usr/local/bin/agent-entrypoint

# Switch to non-root for all subsequent operations
USER agent
WORKDIR /workspace

# Health check: verify Node.js and Git are available
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=2 \
    CMD node --version && git --version || exit 1

ENTRYPOINT ["/usr/local/bin/agent-entrypoint"]
