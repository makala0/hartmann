# Defect catalogue — work in progress on `typy-vad`

**Development and PR base for this task: `typy-vad`. Do not target `master`/main
until the task has been completed and the user requests that integration.**

## Administration

Admin and Service users have a **Číselník vad / Defect catalogue** menu entry at
`/defect-catalog`. Worker access is denied on the server as well as hidden in
navigation. A rule maps one station (1–3) and one camera defect name to a display
code, Czech/English description, optional within-station priority,
and enabled/disabled state.

`Defects.station` is read as ST1, ST2 or ST3 (case-insensitive, trimmed).
`Defects.type` is a name such as `Kontaminace`, `Díra`, `chybějící svár`.
Names are trimmed, Unicode NFC-normalized and compared case-insensitively.
Different spelling/diacritics remain different names: `svár` is not guessed to
mean `svar`. The UI can be used to create explicit mappings after verification.
No station/type mapping or unpublished client code is guessed or seeded.

Each save inserts a new immutable revision. The current revision ID is sent as
`previousRuleId`, and stale updates return 409. Turning a mapping off also
creates a revision; it does not delete history. Codes are reserved for their
original station/name mapping and cannot be reused for another meaning, even
after replacement or deactivation. The reservation primary key protects
concurrent assignments. Historical revisions have no update/delete endpoint.

## Classification and history

On reading an item with defects, the service attempts catalogue classification:

1. Ambiguous business Item IDs are rejected (legacy `Defects.item_id` cannot
   identify a unique item if the name occurs on multiple records).
2. Every observation must have a known enabled mapping for its station/name.
3. Severity comes exclusively from Vision's Item station results (OK/NOK/REWORK).
   The catalogue never defines severity. Unknown results or defects on an OK station remain unresolved.
4. Selection is NOK before REWORK, then **ST3 → ST1 → ST2**.
5. Different types tied on the same station require explicit priorities; higher
   numbers win. Missing or equal priorities remain unresolved rather than using
   a numeric code or incidental row ordering to select a winner.

Only complete classifications create an immutable `item_classifications` row.
The source hash includes item identity, station results and ordered defect
identities/names/stations. Code, descriptions, result, main rule ID/revision and
all matched rule versions are saved. Later catalogue edits do not reclassify
the same source data. New source data can append another history row.
Creation uses an item-row lock and a unique item/hash constraint for idempotency.

The first classification happens when data is first read with a sufficient
catalogue, **not retroactively at the original inspection time**. No unknown
historical rules are reconstructed. Reads, including CSV export, can therefore
write classification history and need database write permission. They do not
update camera observations or stored camera result fields. If corrections to
already saved classifications are needed, provide an explicit audited correction
workflow; changing a rule alone intentionally does not rewrite them.

`ItemDto.priority.catalogStatus` reports `CLASSIFIED`, `UNMAPPED`,
`AMBIGUOUS_ITEM`, `INCONSISTENT`, `AMBIGUOUS_PRIORITY` or `SOURCE_CHANGED`.
For unresolved cases the previous generic station-outcome priority remains
available, clearly labelled with the unresolved catalogue status; its temporary
code is not presented as a confirmed concrete defect code.

`GET /api/dashboard/item/{id}/classifications` returns saved history for an
authenticated user. Catalogue administration is under `/api/defect-catalog`;
`GET /history` includes every immutable rule revision.

## Reporting

The item list/detail shows the saved main code, description and rule version.
The explanation is available by mouse hover and clicking/tapping.
CSV retains its original 21 columns and appends 6: catalogue main code,
description, rule version, main station, mapping state, classification ID.
Concrete code fields remain empty for unresolved cases. Multiple defects do not
duplicate item rows or inflate the item counts.

Camera-derived dashboard counts remain unchanged. The confirmed producer contract
is that a new item row is inserted only after all station results and defects are
complete. A background worker classifies these finished records in ID-ordered
batches of 200, without requiring anyone to open the item first. It starts after
30 seconds and runs a batch every 5 seconds (configurable delay). Catalogue
revisions trigger another scan; existing snapshots are reused, not rewritten.

Both the item tab and order detail accept `mainDefectCode`. The filter matches
exactly, case-insensitively, and combines with existing filters. Before counting
or paging, the indexer catches up to the highest item ID visible at the start of
the request. Thus the first filtered page does not represent only previously
opened items. Unknown, inconsistent or ambiguous records have no confirmed
catalogue code and do not match the code filter. Duplicate legacy business Item
IDs are also excluded, rather than attributing another record's defects.

The administrator's **Complete item classifications** button scans all finished
records again, idempotently. Use it after manual source corrections to older
records; the normal incremental worker assumes finalized camera data is not
modified after insertion. New source versions append history. This action never
reinterprets an unchanged source snapshot merely because the catalogue changed.
An application restart also scans all records again.

Configuration:

```properties
hartmann.classification.enabled=true
hartmann.classification.initial-delay-ms=30000
hartmann.classification.delay-ms=5000
```

Tests disable scheduling and exercise the indexer explicitly to avoid races with
transactional fixtures. `/api/defect-catalog/reindex` requires Admin or Service,
while data filtering remains available to any authenticated user. Cold backfill
can take time on large datasets; use the administration action to prepare it
before the first code-filter request. Database indexes support business identity,
order identity, defect identity and code/history lookups.

## Database deployment

New tables: `defect_rules`, `defect_code_reservations`, `item_classifications`.
The application's existing Hibernate `ddl-auto=update` can create these tables.
Also widen `defects.type` to 200 characters; the old 10-character entity limit
cannot hold the confirmed camera examples. For SQL Server, inspect the current
schema/type and preserve its Unicode/collation behavior. Apply/review the
corresponding migration in staging before production. H2 tests do not verify
this SQL Server migration. No production schema was changed during development.

The delayed drawing extension is not included: image overlays and geometry
remain as before. Unmapped types, camera inconsistencies and intra-station ties
must be resolved through verified catalogue data, not invented meanings.

For databases already using the previous catalogue prototype, remove the NOT NULL constraint on the obsolete defect_rules.severity column (or drop that unused column) before saving new rules. No existing classification snapshots are rewritten.
