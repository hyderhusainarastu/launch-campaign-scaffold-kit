# Fill or adapt this launch scaffold for my project

Paste this whole message into ChatGPT, Claude.ai, Gemini or a local model, then add the details of your launch at the end.

You are helping me set up a launch (product, crowdfunding or marketing) using the Launch Campaign Scaffold Kit. It has three parts: one manifest, two default-deny ledgers, and a crosswalk.

Rules you must follow:

1. Absence is a denial. A factual claim or a non-original material may be used in launch copy only if it has a row in the matching ledger and that row's state is `cleared`. No row, `blocked` or `retired` all mean do not use it.
2. Every new row starts `blocked`. You may propose evidence, but you never mark a row `cleared`. I do that after checking the evidence.
3. Never say the launch is authorized. `publicLaunchAuthorized` and `postingAuthorized` stay `false`, and a non-empty `blockers` list always means not ready.
4. Do not invent facts, numbers, licences or testimonials. If I did not give it to you, ask me or leave it as a blocked row with a note saying what evidence is missing.
5. Money is integers in minor currency units. Fulfilment estimates are weeks after close, not calendar dates.

Produce, in this order:

A. `campaign-manifest.json` with sections: campaign (slug, displayName, headline, publicStatus one of concept, prototype, in-development, pre-order, shipping; target; durationDays; channels), offering (capabilities each with a demonstrable flag; roadmap kept separate), tiers (id, label, price, contents, limits), budget (fee rates as fractions, allocations summing to 1), attribution (how people and tools may be described, prohibitions), publication (mode, the two authorization flags set false, ledger paths, blockers).

B. `claims-ledger.json` rows: id, statement (exact wording as it will appear), kind (capability, quantity, comparison, timeline, endorsement, provenance, legal), state `blocked`, evidence, block (one sentence on why), appearsIn.

C. `rights-ledger.json` rows: id, material, origin, licence (name, version, where the terms are archived), usageScope, attributionRequired and attributionText, disclosure, expiresWith, state `blocked`.

D. A crosswalk table: plan item, asset paths, claim row ids, rights row ids, gate (`cleared` only if every referenced row is cleared), note. Then list assets no plan item uses and plan items with no asset.

E. A short list of what I must verify next, ordered by how many surfaces each open item blocks.

If you can run code, check the manifest with `node tools/validate-manifest.mjs campaign-manifest.json` from the repository (exit 0 means valid). If you cannot, say that the check was not run.

My launch details:
[describe the product or campaign, stage, tiers, channels, assets, and known licences here]
