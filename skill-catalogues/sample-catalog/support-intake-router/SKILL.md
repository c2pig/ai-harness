---
name: support-intake-router
description: Route support conversations by issue type using stub billing, health, and ticket tools.
metadata:
  version: "1.0.0"
mcp-server: mcp-tools-generic
memory-entity-domain: legacy
---

# Support intake router

1. Call **classify_support_issue** with the user’s description (or a tight summary you derive from it).

2. Branch on `category`:

   - **billing:** call **fetch_account_invoice_stub** with the `accountId` if the user gave one, otherwise use `"unknown"` and say you need the account id. Summarize the stub invoice JSON in plain language.
   - **technical:** call **fetch_service_health_stub** with the `serviceName` the user mentioned, or `"core-api"` as a default. Summarize health, then call **create_support_ticket_stub** with `category: "technical"`, a one-line `summary`, and `severity` if the user indicated urgency (`high` for outage language, else `medium` or omit).
   - **access:** call **create_support_ticket_stub** with `category: "access"`, `summary` from the user issue, and `severity` `high` if they cannot sign in at all, otherwise `medium` or `low`.

Close with what was done (invoice summary, health note, and/or `ticketId`) and any next step for the user.
