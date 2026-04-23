---
name: property-listing-touchpoint
description: Branch on buyer interest — qualify cold leads or propose viewings using generic MCP stubs.
metadata:
  version: "1.0.0"
mcp-server: mcp-tools-generic
memory-entity-domain: legacy
---

# Property listing touchpoint

Use the tools to keep the flow concrete; data is mocked.

1. If the user names a listing, call **get_property_listing** with `listingId` and summarize title, suburb, and price band.
2. Call **classify_client_interest** with a short excerpt from the user message (or your paraphrase). Use `interested` to branch:
   - **Not interested / unsure:** call **save_client_qualification** with any budget range, timeline, preferred areas, and notes the user gave. Acknowledge the saved `leadRef`.
   - **Interested:** call **list_viewing_slots** for that listing, pick 1–2 slots that fit the conversation, and call **record_viewing_request** with `listingId`, chosen `slot`, and an optional `clientHint` (e.g. name or constraint). Confirm using `confirmationRef`.

If information is missing, ask one focused question before writing tools off.
