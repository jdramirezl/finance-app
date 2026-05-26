# Extraction Plan: File 2 — Shin Presupuesto Mensual 2024.xlsx

## Summary

Extract all movements (Jan–Dec 2024) and net worth snapshots from a COP-denominated Colombian personal finance spreadsheet into JSON files for human review. No database writes.

**Output directory:** `.agents/resources/output/file2/`
**Files produced:** 12 monthly movement JSONs + 1 snapshot JSON + 1 validation report

---

## 1. Months to Extract

All 12 months. Key structural notes:

| Month | Gastos Start Col | Medio Populated? | Resumen Final Has Balances? | Notes |
|-------|-----------------|------------------|----------------------------|-------|
| January | 0 | NO (empty) | YES (full) | Fixed expense names in Notas, not Medio |
| February | 0 | Partial | YES (grouped by bank) | |
| March | 0 | Partial | YES (grouped by bank) | |
| April | 0 | Partial | YES (grouped by bank) | |
| May | 0 | Partial | YES (grouped by bank) | |
| June | 0 | YES | NO (names only) | |
| July | 0 | YES | NO (names only) | |
| August | 0 | YES | NO (names only) | |
| September | 0 | YES | NO (names only) | |
| October | 0 | YES | NO (names only) | |
| November | 0 | YES | NO (names only) | |
| December | **1 (+1 shift)** | YES | NO (names only) | All sections shifted +1 column |

**December detection:** Check if cell at (row 1, col 0) is empty and (row 1, col 1) contains "Gastos".

---

## 2. Account Mapping Proposal

### Excel Medio → Supabase Account/Pocket Mapping

#### Direct Matches (existing accounts)

| Excel Medio | Supabase Account | Supabase Pocket | Account ID | Pocket ID |
|-------------|-----------------|-----------------|------------|-----------|
| [Nu] Ahorros | Nubank COP | Ahorros | 28c2305d | deebf755 |
| [Bancolombia] Para gastar | Bancolombia | Para gastar | da41fa99 | 7f3b9e25 |
| [Bancolombia] Ahorros | Bancolombia | Ahorros | da41fa99 | 67995d0b |
| Efectivo | COP - Efectivo | Cash | 69eae210 | 79b1fb5d |
| Efectivo Para gastar | COP - Efectivo | Cash | 69eae210 | 79b1fb5d |
| Dolares | USD - Efectivo | Cash | 1ad6393a | 4430bd24 |
| VOO | Hapi/VOO | (default) | 06a793b8 | — |

#### Needs New Pockets (on existing accounts)

| Excel Medio | Supabase Account | New Pocket Needed |
|-------------|-----------------|-------------------|
| [Nu] Viajes | Nubank COP (28c2305d) | Viajes |
| [Nu] Para gastar | Nubank COP (28c2305d) | Para gastar |
| [Nu] Emergencias | Nubank COP (28c2305d) | Emergencias |
| [Nu] Fijos | Nubank COP (28c2305d) | Fijos |
| [Bancolombia] Viajes | Bancolombia (da41fa99) | Viajes |
| [Bancolombia] Fijos | Bancolombia (da41fa99) | Fijos |
| Efectivo Ahorros | COP - Efectivo (69eae210) | Ahorros |

#### Needs New Accounts

| Excel Medio | Proposed Account Name | Currency | Notes |
|-------------|----------------------|----------|-------|
| Nequi | Nequi | COP | Single pocket |
| Tarjeta de Alimentacion | Tarjeta de Alimentación | COP | Single pocket |
| CDT | CDT | COP | Term deposit |
| Tarjeta Debito | (legacy name for Bancolombia Para gastar) | — | Map to Bancolombia / Para gastar |

#### Unprefixed Medio Resolution (early months)

| Excel Medio | Maps To | Rationale |
|-------------|---------|-----------|
| Ahorros | Nubank COP / Ahorros | Primary bank, most common usage |
| Viajes | Nubank COP / Viajes | Primary bank |
| Para gastar | Nubank COP / Para gastar | Primary bank |

#### Fixed Expense Medios (NOT accounts)

These are fixed expense category identifiers, not account names:
`BARBERIA, CELULAR, CREMAS CABELLO, GASOLINA, GIMNASIA, GYM, IMPUESTO, INTERNET, LAVADO CARRO, PARQUEADERO, PROTEINA, PSICOLOGIA, RAPPI, SEGURO, SOAT, SPOTIFY, UBER, VERO`

For Gastos Fijos / Ingresos Fijos movements, the `account_name` field will be set to `"[Fixed] {MEDIO_VALUE}"` to distinguish them from regular account movements.

---

## 3. Section Handling

### Column Indices (Jan–Nov, base_col = 0)

```
GASTOS:
  col 0: Fecha
  col 1: Costo
  col 2: Notas
  col 3: Categoria
  col 4: Medio

INGRESOS:
  col 6: Fecha
  col 7: Ingreso
  col 8: Notas
  col 9: Medio

GASTOS_FIJOS:
  col 11: Fecha
  col 12: Costo
  col 13: Notas
  col 14: Medio

INGRESOS_FIJOS:
  col 16: Fecha
  col 17: Costo
  col 18: Notas
  col 19: Medio
```

### Column Indices (December, base_col = 1)

All above indices + 1:
```
GASTOS:       cols 1, 2, 3, 4, 5
INGRESOS:     cols 7, 8, 9, 10
GASTOS_FIJOS: cols 12, 13, 14, 15
INGRESOS_FIJOS: cols 17, 18, 19, 20
```

### Type Determination

| Section | Movement Type | Amount Handling | Account Source |
|---------|--------------|-----------------|----------------|
| Gastos | `expense` | abs(value) — always positive in source | Medio column (col 4) |
| Ingresos | `income` | abs(value) | Medio column (col 9) |
| Gastos Fijos | `expense` | abs(value) — may be negative in Jan | Medio = fixed expense name, NOT account |
| Ingresos Fijos | `income` | abs(value) | Medio = fixed expense name, NOT account |

### Date Parsing

- Excel serial numbers → ISO date string (YYYY-MM-DD)
- Formula: `new Date((serial - 25569) * 86400 * 1000).toISOString().split('T')[0]`
- Null dates: inherit from previous row's date in same section
- Validate: date should be within the expected month (allow ±5 days for edge cases like Dec entries dated Nov 29)

### Medio Resolution for Early Months

For months where Medio is empty:
1. **Gastos (Jan):** Set `account_name: null` — unknown source
2. **Gastos Fijos / Ingresos Fijos (Jan):** Use Notas column as the fixed expense name
3. **Ingresos (Jan):** Check if Medio is populated (partially filled in Jan)

Logic:
```
if section is "Gastos Fijos" or "Ingresos Fijos":
  fixed_expense_name = medio || notas  // fallback to Notas in early months
  account_name = "[Fixed] " + fixed_expense_name.toUpperCase()
else:
  account_name = medio || null
```

### Row Termination

Stop reading a section when 5+ consecutive rows have no data in ANY of the section's columns (Fecha, Costo/Ingreso, Notas, Medio all empty).

---

## 4. Net Worth Snapshots

### Sources

**Monthly sheets (Jan–May):** "Resumen final" section at col 20–21 contains end-of-month account balances.

**Resumen sheet:** Contains final (likely December) totals with full account breakdown.

### January Snapshot Structure (Col 20–21)

```
Row 3: "Totales" = total_net_worth
Row 4: "Tarjeta Debito" = value
Row 5: "Nequi" = value
Row 6: "Efectivo para Gastar" = value
Row 7: "CDT" = value
Row 8: "Dolares" = value (USD amount, needs conversion note)
Row 9: "Tarjeta de Alimentacion" = value
Row 10: "Ahorros Efectivo" = value
```

### February–May Snapshot Structure (Col 20–21)

```
Row 3: "Totales" = total
Row 4: "Inversiones" = total_investments
Row 5: "Dolares" = usd_amount
Row 6: "Bancolombia" = total_bancolombia
Row 7: "Efectivo" = total_cash
Row 8: "Otros" = total_other

Sub-breakdowns follow at rows 10+
```

### Resumen Sheet Snapshot (December/Final)

From the Resumen sheet row data:
- Total: 89,981,035.17 COP
- Nubank breakdown, Bancolombia breakdown, Inversiones, Efectivo, Otros

### Snapshot Output Format

```json
{
  "snapshots": [
    {
      "date": "2024-01-31",
      "total_cop": 49577895,
      "source": "January sheet - Resumen final",
      "accounts": {
        "Tarjeta Debito": 20798229,
        "Nequi": 54678,
        "Efectivo para Gastar": 125800,
        "CDT": 27465000,
        "Dolares": 200,
        "Tarjeta de Alimentacion": 356918,
        "Ahorros Efectivo": 1040000
      }
    }
  ]
}
```

### Snapshot Dates

| Source | Date | Total COP |
|--------|------|-----------|
| January sheet | 2024-01-31 | 49,577,895 |
| February sheet | 2024-02-29 | 56,798,848 |
| March sheet | 2024-03-31 | 60,699,264 |
| April sheet | 2024-04-30 | 60,699,264 (suspect — same as March) |
| May sheet | 2024-05-31 | 66,586,733 |
| Resumen sheet | 2024-12-31 | 89,981,035 |

June–November have no balance data in monthly sheets.

---

## 5. Coder Task Breakdown

### Wave 1: Shared Utilities

**File:** `.agents/resources/scripts/file2/utils.ts`

**Scope:**
- Excel date serial → ISO date string conversion
- Row reading with gap detection (5 consecutive empty = end)
- Amount normalization (abs value, handle negatives)
- Medio resolution logic (with Notas fallback for early months)
- Account name mapping function (Excel medio → standardized name)
- Section column index calculator (takes base_col, returns all offsets)
- JSON output writer (pretty-printed, to output directory)
- Sheet name → month number mapping

**Dependencies:** `xlsx` package (already in project or install)

**Output:** Utility module, no JSON files yet.

---

### Wave 2: Extract January–May

**File:** `.agents/resources/scripts/file2/extract-jan-may.ts`

**Scope:**
- Open workbook, iterate sheets: January, February, March, April, May
- base_col = 0 for all
- For each month, extract all 4 sections using shared utils
- Handle early-month quirks:
  - January: Medio empty everywhere, fixed expense names in Notas
  - February–May: Medio partially populated
- Date inheritance for null-date rows
- Produce `movements-2024-01.json` through `movements-2024-05.json`

**Special handling:**
- Gastos in January: all rows have `account_name: null` (Medio empty)
- Ingresos Fijos "Reset" entries: include them with `description: "Reset"` and `category: "Budget Allocation"`
- Sub-items (no date, no medio): inherit date from previous row, set `account_name: null`

**Output:** 5 JSON files in `.agents/resources/output/file2/`

---

### Wave 3: Extract June–November

**File:** `.agents/resources/scripts/file2/extract-jun-nov.ts`

**Scope:**
- Open workbook, iterate sheets: June, July, August, September, October, November
- base_col = 0 for all
- All Medio columns populated — straightforward extraction
- Categoria column may have values (sparse) — include when present

**Output:** 6 JSON files in `.agents/resources/output/file2/`

---

### Wave 4: Extract December

**File:** `.agents/resources/scripts/file2/extract-december.ts`

**Scope:**
- Open workbook, read December sheet
- **base_col = 1** (all indices shifted +1)
- Section positions:
  - Gastos: cols 1–5
  - Ingresos: cols 7–10
  - Gastos Fijos: cols 12–15
  - Ingresos Fijos: cols 17–20
- Same extraction logic as Wave 3 but with shifted columns
- Validate: some entries may have November dates (e.g., Nov 29 spotify payment logged in Dec sheet)

**Output:** `movements-2024-12.json` in `.agents/resources/output/file2/`

---

### Wave 5: Net Worth Snapshots

**File:** `.agents/resources/scripts/file2/extract-snapshots.ts`

**Scope:**
- Extract from January sheet: Resumen final at col 20–21, rows 3–10
- Extract from February–May sheets: Resumen final at col 20–21, rows 3–30 (grouped structure)
- Extract from Resumen sheet: Full account breakdown (rows 1–36)
- Parse each into snapshot format with date, total, and per-account breakdown
- Flag April as potentially duplicated (same total as March)

**Output:** `snapshots-file2.json` in `.agents/resources/output/file2/`

---

### Wave 6: Validation Script

**File:** `.agents/resources/scripts/file2/validate.ts`

**Scope:**
- Load all 12 movement JSONs + snapshot JSON
- Checks:
  1. **Row counts match analysis:** Compare extracted row counts per section per month against expected counts from analysis
  2. **No duplicate movements:** Check for exact duplicates (same date + amount + description)
  3. **Date sanity:** All dates within 2024, each month's movements mostly within that month (±5 days tolerance)
  4. **Amount sanity:** No zero amounts (except legitimate "Reset" entries), no absurdly large values (>100M COP)
  5. **Account coverage:** List all unique account_name values, flag any unexpected ones
  6. **Null account summary:** Count movements with null account_name per month (expected high in Jan, low in Jun+)
  7. **Snapshot consistency:** Total should increase over time (flag if not)
  8. **Section totals:** Sum all expenses and income per month, compare against Resumen sheet annual totals if possible

**Output:** `validation-report-file2.json` in `.agents/resources/output/file2/` with pass/fail per check and details.

---

## 6. Movement JSON Schema

Each monthly file contains an array:

```json
[
  {
    "type": "income" | "expense",
    "amount": 50000,
    "description": "comida",
    "date": "2024-03-15",
    "category": "Comida" | null,
    "account_name": "[Nu] Ahorros" | "[Fixed] SPOTIFY" | null,
    "source_sheet": "March",
    "source_section": "Gastos" | "Ingresos" | "Gastos Fijos" | "Ingresos Fijos",
    "source_row": 5,
    "is_reset": false,
    "fixed_expense_name": null | "SPOTIFY"
  }
]
```

**Field notes:**
- `account_name`: null when Medio was empty (early months Gastos). For fixed sections, prefixed with `[Fixed]`.
- `category`: Only populated when Categoria column has a value (sparse, Gastos only).
- `is_reset`: true for "Reset" entries in Ingresos Fijos.
- `fixed_expense_name`: Populated for Gastos Fijos and Ingresos Fijos sections. The actual expense category (SPOTIFY, GYM, etc.).
- `source_row`: 0-indexed row in the sheet for traceability.

---

## 7. Expected Output Summary

```
.agents/resources/output/file2/
├── movements-2024-01.json   (~46 movements)
├── movements-2024-02.json   (~46 movements)
├── movements-2024-03.json   (~73 movements)
├── movements-2024-04.json   (~21 movements)
├── movements-2024-05.json   (~44 movements)
├── movements-2024-06.json   (~83 movements)
├── movements-2024-07.json   (~57 movements)
├── movements-2024-08.json   (~70 movements)
├── movements-2024-09.json   (~33 movements)
├── movements-2024-10.json   (~64 movements)
├── movements-2024-11.json   (~22 movements)
├── movements-2024-12.json   (~45 movements)
├── snapshots-file2.json     (6 snapshots)
└── validation-report-file2.json
```

---

## 8. Implementation Notes

### Tech Stack for Scripts
- TypeScript with `tsx` runner
- `xlsx` package for Excel parsing
- No database dependencies, no Supabase client
- All output is JSON files only

### Running
```bash
cd .agents/resources/scripts/file2
npx tsx extract-jan-may.ts
npx tsx extract-jun-nov.ts
npx tsx extract-december.ts
npx tsx extract-snapshots.ts
npx tsx validate.ts
```

### Critical Rules for Coder Agents
1. **NO DATABASE WRITES** — output JSON files only
2. **NO Supabase imports** — pure file I/O
3. Include ALL rows including Reset entries
4. Preserve source traceability (sheet name, section, row number)
5. Handle the December +1 column shift explicitly
6. Use absolute value for all amounts
7. Inherit dates from previous row when null
8. Stop section reading after 5 consecutive empty rows
9. Fixed expense Medio fallback: check Notas when Medio is empty (Jan)
