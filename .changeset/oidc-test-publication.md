---
"@dcyfr/ai-docker": patch
---

test: verify OIDC Trusted Publisher authentication

This patch release tests the newly configured Trusted Publisher OIDC authentication workflow. The publication should succeed using GitHub Actions OIDC tokens instead of npm secrets, demonstrating enhanced supply chain security through cryptographic provenance.