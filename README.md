# Launch Campaign Scaffold Kit

A directory scaffold and a small governance system for running a product, crowdfunding, or marketing launch without accidentally publishing something you cannot back up.

**Contents:** [The problem](#the-problem) · [Quick start](#quick-start) · [The scaffold](#the-scaffold) · [The manifest](#the-manifest) · [Default-deny ledgers](#default-deny-ledgers) · [The crosswalk](#the-crosswalk) · [Tools](#tools) · [Example](#example) · [Use from an AI coding agent](#use-from-an-ai-coding-agent) · [Companion](#companion) · [Limitations](#limitations) · [Related](#related) · [License](#license)

## The problem

Campaign folders rot in a predictable way. You start with a plan document. Assets accumulate in whatever folder was open at the time. Copy gets written in three places and drifts. Someone drops a stock photo into the video and nobody writes down which licence it came under. A number that was true in an early draft — a playtest count, a ship date, a benchmark — survives into the final page after the thing it described has changed.

None of that is a discipline problem. It is a bookkeeping problem: there is no single place that says *what may be published, and on what evidence*. By launch week the folder looks finished, so it gets treated as finished, and the checking that should have happened per-asset gets compressed into one anxious afternoon.

This kit provides the bookkeeping. Three ideas:

1. **One manifest.** A single JSON file describes the launch — what it is, what stage it is actually at, the tiers, the fee model, what may be said about who made it, and whether publication is authorized at all. Everything else quotes the manifest instead of restating it.
2. **Default-deny ledgers.** Every factual claim gets a row in `claims-ledger.json`. Every non-original material gets a row in `rights-ledger.json`. A row starts `blocked`. If a claim or a material has no row, it is blocked too — absence is a denial, not an oversight. Nothing publishes until its rows read `cleared`.
3. **A crosswalk.** One table mapping plan item → asset → the ledger rows that gate it, so you can see at a glance which plan items are unbuilt, which assets nobody planned, and which single unresolved item is holding up six surfaces.

Nothing here is clever. The value is that it is mechanical: a stranger can open the folder and compute what is safe to publish without asking you a question.

## Quick start

```bash
# 1. Build the tree for a new campaign
./make-scaffold.sh ~/campaigns/my-launch --with-templates

# 2. Write the manifest (copy the example as a starting point)
cp examples/lumen-deck/campaign-manifest.json ~/campaigns/my-launch/campaign-manifest.json
# ...edit it...

# 3. Check it
node tools/validate-manifest.mjs ~/campaigns/my-launch/campaign-manifest.json
# VALID: campaign-manifest.json checks out against campaign-manifest.schema.json

# 4. Inventory whatever assets exist so far
node tools/build-archive-manifest.mjs ~/campaigns/my-launch/04_funding_page/images \
  -o ~/campaigns/my-launch/08_archive/deliverables/images-manifest.json
```

The validator catches structural errors and a few consistency rules the schema cannot express. Break the example on purpose and it says so:

```
INVALID: 4 problem(s) in bad.json
  - /campaign/publicStatus: value "magic" is not one of concept, prototype, in-development, pre-order, shipping
  - /tiers/0: missing required property "label"
  - /publication: publicLaunchAuthorized is true while blockers is non-empty
  - /publication: publicLaunchAuthorized is true but mode is "internal-review"
```

Requirements: Node 18 or later, and bash for the scaffold script. No dependencies to install.

## The scaffold

```
my-launch/
├── campaign-manifest.json          the one canonical description of the launch
├── campaign-manifest.schema.json   the schema it validates against
├── 01_brand/                       identity work
│   ├── source/                     editable masters (vector, layered files)
│   ├── exports/                    flattened output actually used elsewhere
│   └── guidelines/                 how the identity may and may not be used
├── 02_social/                      short-form posts and images
│   ├── source/
│   ├── exports/
│   └── captions/                   caption text and alt text, one file per post
├── 03_longform/                    articles, rulebooks, documentation, decks
│   ├── drafts/
│   └── exports/
├── 04_funding_page/                the campaign or pre-order page itself
│   ├── page/                       page copy, section by section
│   ├── images/
│   └── video/
├── 05_launch_plan/                 what goes out, and when
│   ├── email/
│   ├── outreach/
│   └── calendar/
├── 06_operations/                  what happens after money changes hands
│   ├── support/                    canned replies, escalation notes
│   ├── fulfilment/
│   └── runbooks/
├── 07_governance/                  the part that decides whether any of it ships
│   ├── claims-ledger.json
│   ├── rights-ledger.json
│   └── crosswalk.md
├── 08_archive/                     frozen record of what was actually published
│   ├── deliverables/               final files plus their checksum manifests
│   └── superseded/                 replaced versions, kept deliberately
├── qa/                             proofs and checks, not deliverables
│   ├── exports/                    proof renders, greyscale checks, previews
│   └── reports/                    test logs, inspection notes
└── sources/                        the evidence base
    ├── licences/                   archived licence terms, verbatim
    ├── permissions/                written permissions, releases, quote consent
    └── references/                 specs, quotes, and anything a claim cites
```

Two conventions make the tree work:

**`source/` versus `exports/`.** Editable masters never leave `source/`. Anything referenced by a ledger row or a crosswalk row points at `exports/`. This keeps "which file did we actually publish" answerable.

**`sources/` is the evidence base, not a scrap heap.** A licence you cannot produce is a licence you do not have. Archive the terms as a file at the moment you acquire them, because the URL will be dead when you need it.

## The manifest

`schema/campaign-manifest.schema.json` is a JSON Schema (draft 2020-12) covering:

| Section | Holds |
|---|---|
| `campaign` | Slug, display name, headline, target amount in minor units, duration, channels — and `publicStatus`, the honest answer to "what is this right now": `concept`, `prototype`, `in-development`, `pre-order`, or `shipping`. |
| `offering` | What is being funded. `capabilities` are things the offering does *today*, each with a `demonstrable` flag; anything aspirational goes in `roadmap` and stays out of the campaign copy. |
| `tiers` | Pledge or pre-order tiers with prices in minor units, contents, limits, and fulfilment estimates in weeks-after-close rather than calendar dates. |
| `budget` | Fee rates as fractions, a fulfilment reserve, and allocations that must sum to 1. |
| `attribution` | How the people and tools behind the campaign may be described, including an explicit prohibitions list and whether production tooling is disclosed. |
| `publication` | The kill switch: `mode`, `postingAuthorized`, `publicLaunchAuthorized`, the ledger paths, and an open `blockers` list. |

Prices are integers in minor currency units, and fulfilment estimates are relative rather than dated. Both choices are there to stop a manifest becoming quietly wrong: floats drift, and a hardcoded date is wrong the moment a schedule slips.

`publicLaunchAuthorized: true` with a non-empty `blockers` array is a validation error, not a judgement call.

## Default-deny ledgers

The rule, stated once: **an asset or claim may be published only once its ledger row affirmatively clears it.** No row means blocked. A row in any state other than `cleared` means blocked. This inverts the usual failure mode, where the question "did anyone check this?" has no answer and gets resolved by assuming yes.

`templates/claims-ledger.template.json` documents every column inline. The core ones:

| Column | Purpose |
|---|---|
| `statement` | The claim written exactly as it will appear. Paraphrases hide drift. |
| `kind` | `capability`, `quantity`, `comparison`, `timeline`, `endorsement`, `provenance`, `legal`. |
| `state` | `blocked` \| `cleared` \| `retired`. New rows start blocked. |
| `evidence` | Something a stranger could verify without asking you a question. |
| `block` | One sentence saying why, or `null` once cleared. |
| `appearsIn` | Every surface using the claim — so a retraction is a search, not a memory exercise. |

`templates/rights-ledger.template.json` covers materials — fonts, photos, music, footage, synthesised voice, icons, quotes, third-party marks:

| Column | Purpose |
|---|---|
| `origin` | Commissioned, licensed, public domain, in-house, produced with a tool. Not "internet". |
| `licence` | Name and version, plus the path of the archived terms under `sources/licences/`. "Free" is not a licence. |
| `usageScope` | The specific permissions you rely on. A desktop font licence does not automatically cover video embedding or web serving. |
| `attributionRequired` / `attributionText` | If true, the exact credit string, so every surface uses the same one. |
| `disclosure` | Any audience-facing note the material obliges you to make. |
| `expiresWith` | The condition that ends the permission, or `null`. |

Retired rows stay in the file. Deleting the history of a bad claim is how the same bad claim comes back six weeks later.

## The crosswalk

`templates/crosswalk.template.md` is a table with one row per plan item: plan item, asset paths, claim row ids, rights row ids, a computed gate, and a note. The gate is `cleared` only when the assets exist, every referenced ledger row reads `cleared`, and the manifest revision at the top of the crosswalk matches the current manifest. If you cannot check those mechanically, the crosswalk is decoration.

Underneath the table sit two lists that should both be empty at launch: assets no plan item points at, and plan items with no asset.

The worked example in `examples/lumen-deck/crosswalk.md` shows why the table earns its place — six of nine rows blocked, four of them tracing to one missing printer quote.

## Tools

### `tools/validate-manifest.mjs`

```bash
node tools/validate-manifest.mjs <manifest.json> [schema.json]
```

Dependency-free structural validator implementing the JSON Schema subset the manifest schema uses (`type`, `required`, `properties`, `additionalProperties: false`, `items`, `minItems`, `uniqueItems`, `enum`, `minimum`/`maximum`, `minLength`, `pattern`), plus cross-checks the schema cannot express: authorization flags against blockers and mode, allocation shares summing to 1, duplicate tier ids. Exits 0 valid, 2 invalid.

It is not a conformant JSON Schema implementation. It exists so the repo can self-check with nothing installed; run the same schema through a real validator if you want full coverage.

### `tools/build-archive-manifest.mjs`

```bash
node tools/build-archive-manifest.mjs <assets-dir> [-o out.json] [--no-probe] [--include-hidden]
```

Walks a directory and emits a sorted JSON inventory: relative path, byte size, extension, and sha256 for every file. Where the machine has `sips` or `ffprobe` on `PATH`, it adds image dimensions, video dimensions, duration, and stream kinds. Where it does not, the probe fields are simply absent and the manifest still builds — probing is a bonus, never a requirement.

Output is deliberately boring and sorted, so diffing two runs tells you exactly what changed in an archive between builds. Unreadable files and symlinks are recorded in an `errors` array rather than aborting the run; a non-empty `errors` array exits 3.

## Example

`examples/lumen-deck/` is a complete fictional instance: **Lumen Deck**, an invented tabletop game from an invented studio. It contains a valid manifest, both ledgers with a mix of cleared, blocked, and retired rows, a filled crosswalk, and a three-file assets directory for exercising the archive tool.

The ledger rows are written to show the failure modes worth recognising rather than a tidy all-clear:

- a quantity claim whose evidence contradicts the statement (the copy says "more than two hundred playtesters", the logs count 84),
- an endorsement retired because the group declined to be quoted,
- an illustration licence that covers the product and the page but is silent on paid advertising,
- a synthesised narration track whose required disclosure sentence exists but has not yet reached the screen,
- a photograph blocked on model releases for two identifiable faces.

Every name, number, price, and licence filename in that folder is invented.

## Use from an AI coding agent

Paste [PROMPT.md](PROMPT.md) into ChatGPT, Claude.ai, Gemini or a local model to fill the templates for your launch. Coding agents that read `AGENTS.md` (Codex, Cursor, Claude Code, Gemini CLI, Copilot) get the rule that the claims and rights ledgers are default-deny gates: no launch copy is drafted from a claim or asset whose row is not `cleared`. `npm test` runs the validator offline.

## Companion

Publication review — the checklist you run over an asset before you touch its ledger row, and how to disclose synthetic or generated content — is deliberately out of scope here. That material lives in [pre-publication-review-gate-checklist](https://github.com/hyderhusainarastu/pre-publication-review-gate-checklist), which pairs with this one: the ledgers in this kit are where a review's result gets recorded.

## Limitations

- **The ledgers are not enforced by code.** Nothing in this repo scans your assets and refuses to publish a blocked one. The default-deny rule is a working practice, and the files are a place to record it honestly. A single-person project can clear every row without reading them, and the kit will not notice.
- **The validator is a subset.** It does not implement `$ref`, `allOf`/`anyOf`/`oneOf`, `dependentRequired`, format validation, or `patternProperties`. The schema is written to stay inside what the validator handles; if you extend the schema past that, the validator will silently ignore the parts it does not know.
- **The archive tool does not identify content.** It checksums bytes and reads container metadata. It cannot tell you whether an image is the right image, whether a video is the approved cut, or whether a file's content matches its filename.
- **Media probing depends on the host machine.** `sips` is macOS-only; `ffprobe` needs a separate install. On a machine with neither, you get checksums and sizes and nothing else. That is by design, but it means manifests built on different machines can differ in which fields are present.
- **No legal advice.** The rights ledger is a place to record licence terms, not a source of them. Licence names in the example are invented placeholders. Whether a given use is permitted is a question for the licence you actually hold, and sometimes for a lawyer.
- **No platform integration.** Nothing here talks to a crowdfunding platform, a CMS, or a scheduler. The manifest describes your launch; it does not configure anything.
- **The folder numbering is opinionated.** Stages are numbered `01`–`08` in a rough chronological order that suits a campaign with brand work, social, a long-form artefact, a funding page, and physical fulfilment. A software launch or a pure content launch will want to rename or drop several. Edit `make-scaffold.sh`; the tools do not care about folder names.
- **Currency handling is minimal.** Amounts are integers in minor units with a three-letter code. There is no conversion, no locale formatting, and no handling of currencies without minor units.

## Related

- [pre-publication-review-gate-checklist](https://github.com/hyderhusainarastu/pre-publication-review-gate-checklist): review gate to run before a ledger row is cleared.
- [incident-runbook-template](https://github.com/hyderhusainarastu/incident-runbook-template): runbook for the operations folder.
- [palimnote-templates](https://github.com/hyderhusainarastu/palimnote-templates): the catalog of copy-and-fill templates.

## License

The repository is split:

- Root [LICENSE](LICENSE): MIT. Covers `tools/`, `tests/` and `make-scaffold.sh`.
- [templates/LICENSE](templates/LICENSE): CC BY 4.0 legal code. Covers the files in `templates/`, the schema and the worked example. Copyright (c) 2026 hyderhusainarastu; credit the author when you reuse them.

Part of palimnote-templates - more at https://github.com/hyderhusainarastu
