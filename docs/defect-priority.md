# Priority of station results

The API's `ItemDto.priority` and the **Result by priority** column/detail use:

1. Any NOK precedes every REWORK.
2. For equal severity: **ST3 → ST1 → ST2**.

All three recognized results must be present (`OK`, `NOK`, `REWORK`). Unknown,
missing and technical results produce `INCOMPLETE`, without inventing a code.
Three OK results produce OK without a defect code or winning station.

The stored camera `totalResult`, station results, `defectType`, existing result
filters, statistics and CSV remain unchanged. Priority classification is a new,
derived API field, displayed separately. The deferred drawing extension is not
included. This change does not alter the database schema.

## Temporary codes

| Stable logical key | Temporary display code |
| --- | --- |
| ST1_NOK | 1.0.1 |
| ST1_REWORK | 1.0.2 |
| ST2_NOK | 2.0.1 |
| ST2_REWORK | 2.0.2 |
| ST3_NOK | 3.0.1 |
| ST3_REWORK | 3.0.2 |

These are **unspecified station defect** codes, not mappings to particular
camera `Defects.type` values. Their meanings and priorities do not depend on
their numeric order. The middle `0` reserves the unspecified category; it does
not claim to identify a customer-approved defect entity. Concrete categories,
camera-code mapping, and multiple defects within one station require additional
specification; no tie-breaking order for these defects has been invented.

Override codes without changing the stable logical keys or Java ranking:

```properties
hartmann.defect-codes.version=customer-v1
hartmann.defect-codes.codes[ST1_NOK]=CUSTOM-1
hartmann.defect-codes.codes[ST3_REWORK]=CUSTOM-3
```

Unspecified entries retain their defaults. Use unique codes and increment the
version when changing the mapping. The API returns `logicalKey`, `code` and
`codeVersion` so consumers can distinguish mappings.

This classification is calculated on read, **not a historical classification
snapshot**. Updating the mapping changes the derived display for older items
too, but never rewrites their stored camera codes/results. Keep old mapping
versions with any exported data. Persisted versioned classifications should be
introduced together with the final catalogue before authoritative historical
defect-code reporting is enabled.
