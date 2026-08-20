# Crosswalk

Copy to `<campaign>/07_governance/crosswalk.md`.

The crosswalk answers one question for a stranger reading your campaign folder: **for every item in the plan, which file delivers it, and which ledger rows say that file may go out?**

It exists because plans and folders drift apart. A plan item with no asset is unbuilt work. An asset with no plan item is scope you added without deciding to. An asset with no ledger rows is an unreviewed publication risk sitting in a folder that looks finished.

Fill one row per plan item. Keep the row even after the item ships — a completed row is how you audit later.

Checked against manifest revision: `REPLACE`

## Columns

| Column | Means |
|---|---|
| Plan item | The commitment, in the words your plan uses. One row per deliverable, not per task. |
| Asset(s) | Path(s) inside the campaign tree. `—` if nothing exists yet. |
| Claim rows | Ids from `claims-ledger.json` for every factual assertion the asset makes. `none` only if the asset asserts nothing, which is rarer than it sounds. |
| Rights rows | Ids from `rights-ledger.json` for every non-original material embedded. |
| Gate | `blocked` until every referenced ledger row reads `cleared`; then `cleared`. Compute it, do not judge it. |
| Note | What is missing, in a few words. Empty when the row is cleared. |

## Rows

| Plan item | Asset(s) | Claim rows | Rights rows | Gate | Note |
|---|---|---|---|---|---|
| REPLACE — first plan item | `01_brand/exports/REPLACE.svg` | `slug-001` | `slug-r001` | blocked | Licence terms not archived |
| REPLACE — second plan item | — | none | none | blocked | Not started |

## Reading the gate

The gate column is derived, not asserted. A row is `cleared` only when:

1. At least one asset path exists on disk.
2. Every claim id listed resolves to a row with `state: "cleared"`.
3. Every rights id listed resolves to a row with `state: "cleared"`.
4. The manifest revision at the top matches the current manifest.

If you cannot mechanically check those four things, the crosswalk is decoration. Rebuild it until you can.

## Unmapped work

Two lists worth keeping under the table, both of which should be empty before launch:

- **Assets with no plan item.** Files in the tree that no row points at.
- **Plan items with no asset.** Rows whose asset column is still `—`.
