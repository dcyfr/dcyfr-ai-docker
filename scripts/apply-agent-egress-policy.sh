#!/usr/bin/env bash
set -euo pipefail

# Applies a host-level DOCKER-USER egress allowlist for agent containers.
#
# WARNING:
# - Requires root privileges (iptables).
# - Rules are host firewall rules and affect all containers in AGENT_NET_CIDR.
# - Domain allowlist is resolved to A records at apply time; rerun periodically.
#
# Defaults align with docker-compose.agent.yml.

ALLOWLIST_FILE="${ALLOWLIST_FILE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/configs/network-policy/agent-egress-allowlist.txt}"
AGENT_NET_CIDR="${AGENT_NET_CIDR:-172.30.0.0/16}"
CHAIN_NAME="${CHAIN_NAME:-DCYFR_AGENT_EGRESS}"
DRY_RUN="${DRY_RUN:-0}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] $*"
  else
    eval "$*"
  fi
}

resolve_host_ips() {
  local host="$1"
  getent ahostsv4 "$host" | awk '{print $1}' | sort -u
}

require_cmd iptables
require_cmd getent

if [[ ! -f "$ALLOWLIST_FILE" ]]; then
  echo "Allowlist file not found: $ALLOWLIST_FILE" >&2
  exit 1
fi

# Ensure chain exists and is clean.
run "iptables -N $CHAIN_NAME 2>/dev/null || true"
run "iptables -F $CHAIN_NAME"

# Keep established connections alive.
run "iptables -A $CHAIN_NAME -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT"

# Allow DNS to host resolvers (UDP/TCP 53).
run "iptables -A $CHAIN_NAME -p udp --dport 53 -j ACCEPT"
run "iptables -A $CHAIN_NAME -p tcp --dport 53 -j ACCEPT"

# Allow HTTPS (443) only to resolved allowlist IPs.
while IFS= read -r raw; do
  host="${raw%%#*}"
  host="$(echo "$host" | xargs)"
  [[ -z "$host" ]] && continue

  ips="$(resolve_host_ips "$host" || true)"
  if [[ -z "$ips" ]]; then
    echo "Warning: no A records resolved for $host" >&2
    continue
  fi

  while IFS= read -r ip; do
    [[ -z "$ip" ]] && continue
    run "iptables -A $CHAIN_NAME -d $ip/32 -p tcp --dport 443 -j ACCEPT"
  done <<< "$ips"
done < "$ALLOWLIST_FILE"

# Reject everything else from the agent subnet.
run "iptables -A $CHAIN_NAME -j REJECT"

# Wire chain into DOCKER-USER for the agent network.
if iptables -C DOCKER-USER -s "$AGENT_NET_CIDR" -j "$CHAIN_NAME" 2>/dev/null; then
  echo "DOCKER-USER hook already present for $AGENT_NET_CIDR -> $CHAIN_NAME"
else
  run "iptables -I DOCKER-USER 1 -s $AGENT_NET_CIDR -j $CHAIN_NAME"
fi

echo "Applied egress allowlist policy."
echo "  subnet: $AGENT_NET_CIDR"
echo "  chain:  $CHAIN_NAME"
echo "  file:   $ALLOWLIST_FILE"
