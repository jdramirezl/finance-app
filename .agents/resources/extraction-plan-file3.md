# Extraction Plan: File 3 — Presupuesto Mensual 2025.xlsx

## Summary

Extract movements and net worth snapshots from the Colombia 2025 budget file (Jan–Aug + partial September). This file has a simpler structure than File 2: 4 sections per month, NO Categoria column, account name directly in column index 3 (0-indexed within each section). All output goes to JSON files for human review — no database writes.

**Input**: `.agents/resources/Presupuesto Mensual 2025.xlsx`
**Output**: `.agents/resources/output/file3/`
**Currency**: COP (Colombian Peso)
**Period**: January–August 2025 (complete) + September 2025 (partial, flagged)

---

## 1. Months to Extract

| Month | Sheet Name | Status | Gastos | Ingresos | Gastos Fijos | Ingresos Fijos |
|-------|-----------|--------|--------|----------|--------------|----------------|
| January | January | Complete | 68 | 49 | 17 | 29 |
| February | February | Complete | 17 | 20 | 6 | 15 |
| March | March | Complete | 53 | 55 | 18 | 14 |
| April | April | Complete | 57 | 50 | 19 | 16 |
| May | May | Complete | 36 | 51 | 11 | 17 |
| June | June | Complete | 54 | 50 | 12 | 16 |
| July | July | Complete | 41 | 19 | 21 | 17 |
| August | August | Complete | 63 | 17 | 9 | 18 |
| September | September | **PARTIAL** | 22 | 6 | 2 | 0 |

**Total estimated rows**: ~1,062 movements

**Skip entirely**: October, November, December (empty templates), Party (not financial), PresupuestosV2 (budget config, not transactions)

---

## 2. Account Mapping Proposal

### Excel Account → Supabase Account/Pocket

| Excel Account Name | Supabase Account | Supabase Pocket | Account ID | Pocket ID |
|---|---|---|---|---|
| `[Nu] Ahorros` | Nubank COP | Ahorros | 28c2305d | deebf755 |
| `[Nu] Viajes` | Nubank COP | Viajes | 28c2305d | *needs creation* |
| `[Nu] Para gastar` | Nubank COP | Para gastar | 28c2305d | *needs creation* |
| `[Nu] Emergencias` | Nubank COP | Emergencias | 28c2305d | *needs creation* |
| `[Nu] Regalos` | Nubank COP | Regalos | 28c2305d | *needs creation* |
| `[Bancolombia] Ahorros` | Bancolombia | Ahorros | da41fa99 | 67995d0b |
| `[Bancolombia] Viajes` | Bancolombia | Viajes | da41fa99 | *needs creation* |
| `[Bancolombia]  Fijos` | Bancolombia | Fijos | da41fa99 | *needs creation* |
| `[Bancolombia]  Para gastar` | Bancolombia | Para gastar | da41fa99 | 7f3b9e25 |
| `Efectivo` | COP - Efectivo | *(none)* | 69eae210 | — |
| `Tarjeta de Alimentacion` | Tarjeta de crédito | *(none)* | fab832e0 | — |
| `VOO` | Hapi/VOO | *(none)* | 06a793b8 | — |
| `VOO SHARES` | Hapi/VOO | *(none)* | 06a793b8 | — |
| `CDT` | *needs creation* | *(none)* | — | — |
| `Nequi` | *needs creation* | *(none)* | — | — |

### Status/Placeholder Values (NOT real accounts)

These appear in the account column but are status markers:

| Value | Handling |
|-------|----------|
| `-` | Map to `"UNKNOWN"` — flag for review |
| `Done` / `done` | Map to `"UNKNOWN"` — flag for review |
| `n/a` | Map to `"UNKNOWN"` — flag for review |
| `n/a devoluacion` | Map to `"UNKNOWN"` — flag for review |
| `No paga` | Map to `"UNKNOWN"` — flag for review |
| `No pedi` | Map to `"UNKNOWN"` — flag for review |
| `ya` | Map to `"UNKNOWN"` — flag for review |

All flagged entries get `"needs_review": true` in the output JSON.

---

## 3. Section Handling

### Sheet Layout

All month sheets (Jan–Aug) have identical structure:
- **Row 0**: Empty
- **Row 1**: Section headers
- **Row 2**: Empty separator
- **Row 3+**: Data rows

### Four Sections Per Month

| Section | Type | Start Col (0-indexed) | Date Col | Amount Col | Description Col | Account/Category Col |
|---------|------|----------------------|----------|------------|-----------------|---------------------|
| Gastos | `expense` | 2 | 2 | 3 | 4 | 5 |
| Ingresos | `income` | 7 | 7 | 8 | 9 | 10 |
| Gastos Fijos | `fixed_expense` | 12 | 12 | 13 | 14 | 15 |
| Ingresos Fijos | `fixed_income` | 17 | 17 | 18 | 19 | 20 |

### Column Schema (relative to section start)

```
Offset +0: Date (Excel serial number, type 'n')
Offset +1: Amount (number, COP)
Offset +2: Description (string)
Offset +3: Account name (Gastos/Ingresos) OR Category name (Gastos Fijos/Ingresos Fijos)
```

**CRITICAL**: There is NO 5th column. No "Categoria" column exists. The 4th column (offset +3) serves dual purpose:
- In **Gastos** and **Ingresos**: it's the account/pocket name (e.g., `[Nu] Ahorros`)
- In **Gastos Fijos** and **Ingresos Fijos**: it's the fixed expense category (e.g., `GASOLINA`)

### Date Handling

- Dates are Excel serial numbers. Conversion: `new Date((serial - 25569) * 86400 * 1000)`
- Some rows have **missing dates** — inherit from the nearest row above that has a date
- Some dates are **strings** (e.g., `"30/2/24"`) — parse manually, flag if ambiguous
- September has **NO dates at all** — use `"2025-09-01"` as default, flag all entries

### Row Validity

A row is valid if it has at least an **amount** (col+1 is a number > 0). Skip rows where amount is empty/zero AND description is empty.

### "Cambio de Planilla" Handling

These are balance initialization entries (only in January). Per user decision: **INCLUDE them as real movements**. They represent actual money being carried forward.

Output format:
```json
{
  "type": "income",
  "amount": 43964221,
  "description": "cambio de planilla",
  "date": "2025-01-02",
  "category": null,
  "account_name": "[Nu] Ahorros",
  "source_sheet": "January",
  "source_section": "Ingresos",
  "is_initial_balance": true
}
```

---

## 4. Special Sheets

### Party Sheet — SKIP

Not a financial record. It's a one-off expense splitting calculator for a party (16 people, 379,400 COP total). No dates, no account references. **Do not extract.**

### Orlando_Agosto Sheet — EXTRACT (limited)

Orlando trip expense tracker (August 2025). Extract only items marked as "mio" (user's personal expenses) that have clear amounts.

**Challenges**:
- No standard date/amount/description/account column layout
- Mixed COP and USD amounts
- Debt tracking between people (gordo me debe / debo a gordo)
- No dates per item (trip was in August 2025)

**Extraction approach**:
- Extract rows where col G = "mio" (user's own expenses)
- Use `"2025-08-15"` as default date (mid-August, trip month)
- Amount from "total" column (per-person after split) or "con cambio" (COP converted)
- Map to appropriate account based on col H notes (e.g., "nubank")
- Flag all as `"source_sheet": "Orlando_Agosto", "needs_review": true`
- Output to separate file: `orlando-movements.json`

### September Sheet — EXTRACT (flagged)

Partial data, no dates, "done" used as account value.

**Extraction approach**:
- Extract all rows with amounts
- Default date: `"2025-09-01"` for all entries
- Flag all entries: `"is_partial": true, "needs_review": true`
- Entries with `"done"` as account → map to `"UNKNOWN"`

---

## 5. Net Worth Snapshots

### Source: Resumen Sheet

The Resumen sheet contains a **single point-in-time snapshot** (cumulative as of August 2025). It does NOT have monthly breakdowns.

### Snapshot Data (from Left Panel)

```json
{
  "date": "2025-08-20",
  "total_cop": 122166762.60,
  "breakdown": {
    "inversiones": 88428479.97,
    "dolares_usd": 469,
    "bancolombia": 17675188.90,
    "efectivo": 2075000,
    "otros": 100659,
    "nubank": 12161708.86
  },
  "accounts": {
    "[Nu] Ahorros": 0,
    "[Nu] Viajes": 1064264.59,
    "[Nu] Fijos": 3836475.36,
    "[Nu] Para gastar": 0,
    "[Nu] Emergencias": 7260968.90,
    "[Nu] Regalos": 848403,
    "[Bancolombia] Ahorros": 220611.56,
    "[Bancolombia] Viajes": 17402674,
    "[Bancolombia]  Fijos": 0,
    "[Bancolombia]  Para gastar": 51903.34,
    "VOO_usd": 19399.32,
    "VOO_cop": 71381467.45,
    "VOO_shares": 35.05533,
    "CDT": 0,
    "Tarjeta de Alimentacion": 100659,
    "Efectivo": 2075000
  },
  "source_sheet": "Resumen",
  "notes": "Single cumulative snapshot from Resumen dashboard. Date estimated from last August entry (Aug 20)."
}
```

### Monthly Snapshots Strategy

Since Resumen only gives one cumulative snapshot, we can **derive monthly snapshots** by computing running balances from extracted movements:
1. Start with January "cambio de planilla" entries as initial balances
2. Apply each month's movements sequentially
3. Produce end-of-month balance snapshots
4. Validate final snapshot against Resumen totals

This derivation happens in Wave 6 (validation).

---

## 6. Coder Task Breakdown

### Wave 1: Shared Utilities

**File**: `.agents/resources/scripts/file3/utils.ts`

**Scope**:
- Excel serial date → ISO date string converter
- String date parser (handles `"30/2/24"` format edge cases)
- Account name normalizer (trim whitespace, handle double-spaces in Bancolombia names)
- Status value detector (returns true for `-`, `Done`, `done`, `n/a`, `No paga`, `No pedi`, `ya`, `n/a devoluacion`)
- Row validator (has amount > 0 or non-empty description)
- Section config constant:
  ```typescript
  const SECTIONS = [
    { name: 'Gastos', startCol: 2, type: 'expense' },
    { name: 'Ingresos', startCol: 7, type: 'income' },
    { name: 'Gastos Fijos', startCol: 12, type: 'fixed_expense' },
    { name: 'Ingresos Fijos', startCol: 17, type: 'fixed_income' },
  ] as const;
  ```
- Account mapping constant (Excel name → proposed Supabase mapping)
- Output JSON writer helper (writes to `.agents/resources/output/file3/`)
- Date inheritance logic: track last-seen date per section, use it when current row has no date

**Dependencies**: `xlsx` (already used in File 2 extraction)

---

### Wave 2: Extract January–April

**File**: `.agents/resources/scripts/file3/extract-jan-apr.ts`

**Scope**:
- Read sheets: `January`, `February`, `March`, `April`
- For each sheet, iterate all 4 sections starting at row 3
- For each valid row, produce a movement object:
  ```typescript
  {
    type: 'income' | 'expense' | 'fixed_expense' | 'fixed_income',
    amount: number,
    description: string,
    date: string, // ISO format YYYY-MM-DD
    category: string | null, // only for Gastos Fijos / Ingresos Fijos
    account_name: string | null, // only for Gastos / Ingresos
    source_sheet: string,
    source_section: string,
    source_row: number,
    is_initial_balance: boolean, // true for "cambio de planilla"
    needs_review: boolean, // true if account is a status value
    flags: string[] // e.g., ["no_date", "status_as_account", "string_date"]
  }
  ```
- Handle January's "cambio de planilla" entries (mark `is_initial_balance: true`)
- Handle missing dates (inherit from previous row)
- Handle status values as account names (flag for review)

**Output**: `.agents/resources/output/file3/movements-jan.json`, `movements-feb.json`, `movements-mar.json`, `movements-apr.json`

**Expected volume**: ~68+49+17+29 + 17+20+6+15 + 53+55+18+14 + 57+50+19+16 = ~503 rows

---

### Wave 3: Extract May–August

**File**: `.agents/resources/scripts/file3/extract-may-aug.ts`

**Scope**:
- Same logic as Wave 2, applied to sheets: `May`, `June`, `July`, `August`
- Same output format
- Handle July's "Done" account values
- Handle August's "n/a" and "n/a devoluacion" account values

**Output**: `.agents/resources/output/file3/movements-may.json`, `movements-jun.json`, `movements-jul.json`, `movements-aug.json`

**Expected volume**: ~36+51+11+17 + 54+50+12+16 + 41+19+21+17 + 63+17+9+18 = ~452 rows

---

### Wave 4: September + Orlando_Agosto

**File**: `.agents/resources/scripts/file3/extract-special.ts`

**Scope**:

#### September (partial month)
- Same 4-section extraction as other months
- ALL entries get `date: "2025-09-01"` (no dates in sheet)
- ALL entries get `is_partial: true` and `needs_review: true`
- `"done"` account values → `account_name: "UNKNOWN"`, flagged

#### Orlando_Agosto (trip expenses)
- Parse the non-standard layout (rows 11-59)
- Column mapping:
  - Col A (0): `cosa` (item description)
  - Col B (1): `valor` (price)
  - Col C (2): `ctd` (quantity/split divisor)
  - Col D (3): `total` (per-person amount)
  - Col E (4): `con cambio` (COP converted amount, when original is USD)
  - Col F (5): *(varies)*
  - Col G (6): owner marker (`mio`, `debo a gordo`, `gordo me debe a mi`, `vero me debe a mi`)
  - Col H (7): payment method notes
- Extract ONLY rows where col G = `"mio"` (user's personal expenses)
- Use `con cambio` (col E) if available, otherwise `total` (col D) for amount
- Default date: `"2025-08-15"`
- Default account: infer from col H if present, otherwise `"UNKNOWN"`
- All entries flagged: `needs_review: true`

**Output**:
- `.agents/resources/output/file3/movements-sep.json`
- `.agents/resources/output/file3/movements-orlando.json`

---

### Wave 5: Net Worth Snapshots

**File**: `.agents/resources/scripts/file3/extract-net-worth.ts`

**Scope**:
- Parse Resumen sheet left panel (cols A-D, rows 1-37)
- Extract the single cumulative snapshot with per-account balances
- Produce one snapshot object with date `"2025-08-20"` (last data point in August sheet)
- Include group totals and individual account balances
- Include VOO data (USD amount, COP converted, share count, delta rate)

**Output**: `.agents/resources/output/file3/net-worth-snapshot.json`

Format:
```json
{
  "snapshots": [
    {
      "date": "2025-08-20",
      "total_cop": 122166762.60,
      "currency": "COP",
      "accounts": [
        { "name": "[Nu] Ahorros", "balance": 0, "currency": "COP" },
        { "name": "[Nu] Viajes", "balance": 1064264.59, "currency": "COP" },
        { "name": "VOO", "balance_usd": 19399.32, "balance_cop": 71381467.45, "shares": 35.05533 }
      ],
      "source_sheet": "Resumen",
      "notes": "Single cumulative snapshot. Date estimated from last August entry."
    }
  ]
}
```

---

### Wave 6: Validation

**File**: `.agents/resources/scripts/file3/validate.ts`

**Scope**:
- Load all movement JSON files from waves 2-4
- Compute per-account running balances:
  1. Start at 0 for each account
  2. Add `income` and `fixed_income` amounts
  3. Subtract `expense` and `fixed_expense` amounts
- Compare final computed balances against Resumen snapshot values
- Report discrepancies with tolerance (±1 COP for rounding)
- Produce validation report:
  - Total movements extracted per month
  - Per-account balance comparison (computed vs Resumen)
  - List of flagged entries (needs_review count)
  - List of entries with missing dates
  - List of entries with status-value accounts

**Output**: `.agents/resources/output/file3/validation-report.json`

Format:
```json
{
  "summary": {
    "total_movements": 1062,
    "by_month": { "January": 163, "February": 58, ... },
    "flagged_for_review": 15,
    "missing_dates": 3,
    "status_accounts": 12
  },
  "balance_comparison": [
    {
      "account": "[Nu] Ahorros",
      "computed": 0,
      "resumen": 0,
      "difference": 0,
      "status": "MATCH"
    }
  ],
  "flagged_entries": [
    { "source": "movements-jul.json", "index": 5, "reason": "status_as_account", "value": "Done" }
  ]
}
```

---

## 7. Output File Structure

```
.agents/resources/output/file3/
├── movements-jan.json
├── movements-feb.json
├── movements-mar.json
├── movements-apr.json
├── movements-may.json
├── movements-jun.json
├── movements-jul.json
├── movements-aug.json
├── movements-sep.json          (flagged as partial)
├── movements-orlando.json      (flagged for review)
├── net-worth-snapshot.json
└── validation-report.json
```

---

## 8. Key Differences from File 2

| Aspect | File 2 (2024) | File 3 (2025) |
|--------|---------------|---------------|
| Categoria column | YES (5th column) | **NO** — only 4 columns per section |
| Account column index | Offset +3 (Medio) + Offset +4 (Categoria) | Offset +3 only (serves as account) |
| Currency | COP | COP |
| Period | Jan–Dec 2024 | Jan–Aug 2025 + partial Sep |
| Special sheets | None | Orlando_Agosto, Party |
| Net worth source | Monthly snapshots | Single cumulative (Resumen) |
| "Cambio de planilla" | Present | Present (January only) |
| Date format | Excel serial | Excel serial (same) |
| Section start row | Row 3 | Row 3 (same) |
| Section columns | Same positions | Same positions |

---

## 9. Risk Factors

1. **September no-date entries**: All 30 entries will have synthetic date `2025-09-01` — user must verify
2. **Orlando_Agosto non-standard format**: Manual column mapping, may miss some entries
3. **Double-space in Bancolombia names**: `[Bancolombia]  Para gastar` and `[Bancolombia]  Fijos` have double spaces — normalizer must handle this
4. **VOO SHARES as account**: This is a share count, not a COP amount — needs special handling in validation
5. **Resumen is formula-based**: Values may not perfectly match sum of movements due to rounding or formula quirks
6. **Missing dates in some rows**: Date inheritance logic must be robust (track per-section, not globally)

---

## Sources

- [Analysis File 3](/local/home/jdrami/finance-app/.agents/resources/analysis-file3.md) — accessed 2026-05-24
- [Presupuesto Mensual 2025.xlsx](/local/home/jdrami/finance-app/.agents/resources/Presupuesto Mensual 2025.xlsx) — accessed 2026-05-24
