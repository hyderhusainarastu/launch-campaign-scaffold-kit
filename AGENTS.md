# AGENTS.md

## Using this in your project

- Treat `claims-ledger.json` and `rights-ledger.json` as default-deny gates. Read both before drafting any launch copy, page text, caption or email.
- A claim or material may appear in copy only if its row has `state: "cleared"`. A missing row, a `blocked` row or a `retired` row means do not use it.
- Quote the manifest (`campaign-manifest.json`) for names, prices, status and tiers. Do not restate them from memory.
- When you write a new claim into copy, add a ledger row first, starting as `blocked`, with the exact statement and the surfaces in `appearsIn`. Never mark a row `cleared` yourself; report it and let the named owner clear it.
- Never set `publicLaunchAuthorized` or `postingAuthorized` to true. That is the owner's kill switch.
- Validate before and after edits: `node tools/validate-manifest.mjs <manifest.json>`. Exit 0 valid, 1 usage or read error, 2 invalid.
- Build the tree for a new campaign with `./make-scaffold.sh <dir> --with-templates`.
- Everything under `examples/lumen-deck/` is fictional. Do not copy its numbers or licences into a real campaign.
- No `PROMPT.md` is needed for tools use; `PROMPT.md` is the paste version for chat assistants.

## Working on this repo

- Node 18 or later, bash. No dependencies to install.
- Test: `npm test` (validates the example, then a deliberately broken manifest at `tests/fixtures/broken-manifest.json`, which must exit 2). Tests run offline.
- Keep the validator dependency-free and keep the schema inside the JSON Schema subset the validator implements.
- Licenses: root is MIT; `templates/LICENSE` is CC BY 4.0. Do not add a second license file at the root.
- Do not commit `.env*`, local absolute paths or real campaign data.
