# Extraction Plan: File 1 — Presupuesto mensual.xlsx (2023 Only)

## Scope

**Period**: January 2023 – December 2023 (COP, Colombia)
**Output**: JSON files in `.agents/resources/output/file1/`
**Rule**: NO database writes. Coder agents produce JSON only.

---

## 1. Months to Extract & Sheet Mapping

| Month | Sheet(s) | Format | Notes |
|-------|----------|--------|-------|
| Jan 2023 | `123`, `223` (partial) | V1 | 123 is primary Jan sheet; 223 has some Jan dates |
| Feb 2023 | `223` (partial), `323` | V1 | 223 has Feb dates; 323 is primary Feb-Mar |
| Mar 2023 | `323` (partial) | V1 | 323 covers Feb-Mar |
| Apr 2023 | `423` | V1 | Clean single month |
| May 2023 | `523 - 1`, `523 - 2` | V1, V1.5 | Split: 1-8 May (V1), 24-31 May (V1.5) |
| Jun 2023 | `623 - 1`, `623 - 2` | V1.5, V2 | Split: 3-23 Jun (V1.5), 23-28 Jun (V2) |
| Jul 2023 | `823` | V2 | 823 covers Jun 18 – Aug; filter by date |
| Aug 2023 | `823`, `9-1023` | V2, V2+ | 823 tail + 9-1023 start (Aug 25+) |
| Sep 2023 | `9-1023` | V2+ | Filter by date |
| Oct 2023 | `9-1023` | V2+ | Filter by date |
| Nov 2023 | `9-1023` | V2+ | Filter by date (ends Nov 6) |
| Dec 2023 | `1223`, `12723` | V2, V2 Ext | 1223 is primary; 12723 starts Dec 7 |

**Deduplication rule**: When a movement appears in overlapping sheets (e.g., 223 has Jan dates that also appear in 123), deduplicate by (date + amount + description). Prefer the sheet whose name matches the month.

**Sheets EXCLUDED from File 1** (2024 data, handled by File 2):
- `124`, `224`, `424`, `524`, `TransaccionesV2`, `FijosV2`, `PresupuestosV2`, `ResumenV2`

**Sheets with mixed 2023/2024 data**:
- `1223`: Extract only rows with dates in Dec 2023 (ignore Jan 2024 rows)
- `12723`: Extract only rows with dates in Dec 2023 (ignore Jan 2024+ rows)

---

## 2. Account Mapping Proposal

### Direct Matches (Excel → Supabase)

| Excel "Medio" Value | Proposed Supabase Account | Account ID | Pocket | Pocket ID |
|---------------------|--------------------------|------------|--------|-----------|
| Ahorros | Bancolombia | da41fa99 | Ahorros | 67995d0b |
| Para gastar | Bancolombia | da41fa99 | Para gastar | 7f3b9e25 |
| Efectivo / Efectivo para Gastar / Efectivo Para gastar | COP - Efectivo | 69eae210 | Cash | 79b1fb5d |
| Tarjeta / Tarjeta Credito / T. Credito / Pago Tarjeta | Tarjeta de crédito | fab832e0 | (default) | — |
| VOO | Hapi/VOO | 06a793b8 | Invested Money | a8f48702 |
| Dolares | USD - Efectivo | 1ad6393a | Cash | 4430bd24 |

### Need New Legacy Accounts (proposal)

| Excel "Medio" Value | Proposed New Account | Currency | Notes |
|---------------------|---------------------|----------|-------|
| Nequi | Legacy - Nequi | COP | Digital wallet, no longer used |
| Viajes | Legacy - Viajes | COP | Travel savings pocket (could also be a pocket under Bancolombia) |
| CDT | Legacy - CDT | COP | Term deposit, closed |
| Tarjeta de Alimentacion | Legacy - Tarjeta Alimentación | COP | Food card from employer |
| Efectivo Ahorros / Ahorros Efectivo | Legacy - Efectivo Ahorros | COP | Cash savings (or map to COP - Efectivo) |
| Copagos & medicamentos | Legacy - Copagos | COP | Medical fund |
| Inversiones | Legacy - Inversiones | COP | General investments |
| Bancolombia | Bancolombia | da41fa99 | Ahorros pocket (67995d0b) |

### Unmapped (V1 sheets with no Medio)

For V1 sheets (123, 223, 323, 423, 523-1) that have NO "Medio" column:
- Set `account_name: "Unknown (V1 - no medio)"` in JSON output
- User will manually assign these during review

### Normalization Rules

```
"Efectivo para Gastar" | "Efectivo Para gastar" | "Efectivo Para Gastar" → "Efectivo para gastar"
"Tarjeta" | "Tarjeta Credito" | "T. Credito" | "Pago Tarjeta" → "Tarjeta de crédito"
"Ahorros Efectivo" | "Efectivo Ahorros" → "Efectivo Ahorros"
"Puse la tarjeta" → "Tarjeta de crédito"
```

---

## 3. Extraction Rules Per Structural Variant

### V1 Format (Sheets: 123, 223, 323, 423, 523-1)

**Header detection**:
- Sheets 123, 223, 323: Header at row 5 (0-indexed). Data starts row 6.
- Sheets 423, 523-1: Header at row 2 (0-indexed). Data starts row 3.
- Detect header by finding row containing "Fecha" in column B.

**Column mapping**:
```
EXPENSES (left):          INCOME (right):
A: Day number (ignore)    G: Fecha
B: Fecha                  H: Importe (amount)
C: Importe (amount)       I: Descripción
D: Descripción            J: Categoría
E: Categoría
```

**Parsing rules**:
- `type`: Left side = "expense", Right side = "income"
- `amount`: Column C (expenses) or H (income). Parse as number, take absolute value.
- `description`: Column D (expenses) or I (income). Trim whitespace.
- `date`: Column B (expenses) or G (income). Parse Excel date serial or ISO string.
- `category`: Column E (expenses) or J (income).
- `account_name`: Always `"Unknown (V1 - no medio)"` — no Medio column exists.
- Skip rows where amount is 0 or empty.
- Skip rows where amount cell contains only text in parentheses (notes, not transactions).

**Balance extraction** (123, 223, 323 only):
- Row 0, Col D: "Saldo inicial" value
- Row 1, Col D: "Saldo final" value
- Use for net worth snapshot derivation.

---

### V1.5 Format (Sheets: 523-2, 623-1)

**Header detection**: Header at row 2. Data starts row 3.

**Column mapping**:
```
EXPENSES (left):          INCOME (right):
A: Day number (ignore)    H: Fecha
B: Fecha                  I: Importe (amount)
C: Importe (amount)       J: Descripción
D: Descripción            K: Categoría
E: Categoría              L: Medio
F: Medio
```

**Parsing rules**:
- Same as V1 PLUS:
- `account_name`: Column F (expenses) or L (income). May be empty — use `"Unknown (V1.5 - medio empty)"` if blank.
- Normalize Medio values per normalization rules above.

---

### V2 Standard Format (Sheets: 623-2, 823, 9-1023, 1223)

**Header detection**: Header at row 2. Data starts row 3.

**Column mapping**:
```
EXPENSES (left):          INCOME (right):
B: Fecha                  H: Fecha
C: Costo (amount)         I: Costo (amount)
D: Notas (description)    J: Notas (description)
E: Categoria              K: Medio
F: Medio
```

**Parsing rules**:
- `type`: Left = "expense", Right = "income"
- `amount`: Column C or I. Absolute value.
- `description`: Column D or J.
- `date`: Column B or H.
- `category`: Column E for expenses. Income has NO category — set to `null`.
- `account_name`: Column F or K. Normalize.
- **Reset entries**: If `description` == "Reset" or "RESET" → set `type: "income"`, add `"is_reset": true` flag. INCLUDE in output (user wants all entries).

**Sheet-specific handling**:

**823 — Multi-section**:
- Has a second section starting around row 17 with its own header.
- Detect section boundary: look for a row with "Fecha" in column B after data rows.
- Parse each section independently with same column mapping.

**9-1023 — Extra fixed expense columns**:
- Main transactions: columns B–K (same as above).
- Fixed expense payments: columns M–W in groups of 3:
  - Group 1: M(Fecha), N(Costo), O(Categoria)
  - Group 2: Q(Fecha), R(Costo), S(Categoria)
  - Group 3: U(Fecha), V(Costo), W(Categoria)
- Extract these as expenses with `category` = the value in the Categoria column (which is actually the fixed expense name like CELULAR, BARBERIA).
- Set `account_name: "Fixed Expense Payment"` and `source_section: "Fijos"`.

**1223 — Mixed dates**:
- Contains Dec 2023 AND Jan 2024 data.
- Filter: only include rows where date year == 2023.

---

### V2 Extended Format (Sheet: 12723)

**Section detection**:
- Section A (Summary): Starts at top, skip entirely.
- Section B (Transactions): Find row containing "Fecha" + "Costo" + "Notas" + "Categoria" + "Medio" in columns B-F.
- Section C (Fijos): Find second occurrence of header pattern after Section B ends.

**Section B column mapping** (same as V2 Standard):
```
EXPENSES: B(Fecha), C(Costo), D(Notas), E(Categoria), F(Medio)
INCOME: H(Fecha), I(Costo/Ingreso), J(Notas), K(Medio)
```

**Section C column mapping** (Fixed expenses):
```
EXPENSES: B(Fecha), C(Costo), D(Notas), E(Medio=fixed expense name)
INCOME: G(Fecha), H(Costo), I(Notas), J(Medio=fixed expense name)
```

**Parsing rules for Section C**:
- `type`: Left = "expense", Right = "income"
- `category`: Use the "Medio" value (E or J) as category since it's the fixed expense name.
- `account_name`: Set to `"Fixed Expense"` (the Medio column here is NOT an account).
- `source_section`: `"Fijos"`

**Date filter**: Only include rows with 2023 dates.

---

## 4. Net Worth Snapshot Extraction

### Strategy

Derive one snapshot per month from available balance data.

**Source 1: Saldo inicial/final (V1 sheets 123, 223, 323)**
- These provide total balance at start/end of month.
- Single number — no per-account breakdown available.
- Create snapshot with `breakdown.accounts = [{"name": "Total (no breakdown)", "value": X}]`

**Source 2: Reset entries (sheet 1223, 12723)**
- Reset entries give per-account balances at a point in time.
- Sum all Reset amounts for total.
- Group by Medio for breakdown.
- 1223 Resets dated 2023-12-07 → use as Dec 2023 snapshot.

**Source 3: Derived from running balance**
- For months without explicit balance data (Apr–Nov 2023): derive from previous balance + income - expenses.
- This is approximate and should be flagged as `"derived": true`.

### Snapshot output plan

| Month | Source | Method |
|-------|--------|--------|
| Jan 2023 | 123 Saldo final | Direct: 1,605,000 COP |
| Feb 2023 | 223 Saldo final | Direct from sheet |
| Mar 2023 | 323 Saldo final | Direct from sheet |
| Apr 2023 | Derived | Previous + income - expenses |
| May 2023 | Derived | Previous + income - expenses |
| Jun 2023 | Derived | Previous + income - expenses |
| Jul 2023 | Derived | Previous + income - expenses |
| Aug 2023 | Derived | Previous + income - expenses |
| Sep 2023 | Derived | Previous + income - expenses |
| Oct 2023 | Derived | Previous + income - expenses |
| Nov 2023 | Derived | Previous + income - expenses |
| Dec 2023 | 1223 Resets | Sum of Reset entries (2023-12-07) |

**Dec 2023 Reset breakdown** (from analysis):
```json
{
  "date": "2023-12-31",
  "total_value": 36256000,
  "currency": "COP",
  "derived": false,
  "source": "1223 Reset entries (2023-12-07)",
  "breakdown": {
    "accounts": [
      {"name": "Ahorros", "value": 5454000},
      {"name": "Viajes", "value": 2883000},
      {"name": "Para gastar", "value": 411000},
      {"name": "CDT", "value": 27465000},
      {"name": "Efectivo para gastar", "value": 43000}
    ]
  }
}
```

---

## 5. Coder Task Breakdown

### Wave 1: Shared Utilities

**Task**: Create extraction utilities and output formatter.

**Files to produce**:
- `scripts/file1-extraction/utils/excel-reader.ts` — Read xlsx, handle date parsing, cell type detection
- `scripts/file1-extraction/utils/output-formatter.ts` — Format movements/snapshots to target JSON schema
- `scripts/file1-extraction/utils/normalizer.ts` — Medio normalization, category cleanup
- `scripts/file1-extraction/utils/types.ts` — TypeScript interfaces

**Specifications**:

```typescript
// types.ts
interface RawMovement {
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string; // ISO format YYYY-MM-DD
  category: string | null;
  account_name: string;
  source_sheet: string;
  source_section: "Gastos" | "Ingresos" | "Fijos";
  is_reset?: boolean;
}

interface Snapshot {
  date: string; // YYYY-MM-DD (last day of month)
  total_value: number;
  currency: "COP";
  derived: boolean;
  source: string;
  breakdown: {
    accounts: Array<{ name: string; value: number }>;
  };
}
```

**Date parsing logic**:
```typescript
// Handle: Excel serial number, ISO string "2023-01-04", short "5/24"
function parseDate(cell: any, sheetYear: number, sheetMonth: number): string | null
```

**Medio normalization map** (hardcoded):
```typescript
const MEDIO_NORMALIZE: Record<string, string> = {
  "Efectivo para Gastar": "Efectivo para gastar",
  "Efectivo Para gastar": "Efectivo para gastar",
  "Efectivo Para Gastar": "Efectivo para gastar",
  "Tarjeta Credito": "Tarjeta de crédito",
  "T. Credito": "Tarjeta de crédito",
  "Pago Tarjeta": "Tarjeta de crédito",
  "Tarjeta": "Tarjeta de crédito",
  "Puse la tarjeta": "Tarjeta de crédito",
  "Ahorros Efectivo": "Efectivo Ahorros",
  "Efectivo Ahorros": "Efectivo Ahorros",
};
```

**Dependencies**: `xlsx` (SheetJS) npm package for reading Excel files.

---

### Wave 2: Extract V1 Sheets (123, 223, 323, 423, 523-1)

**Task**: Parse V1 format sheets and output monthly JSON files.

**Input**: `.agents/resources/Presupuesto mensual.xlsx`
**Output**: `movements-2023-01.json` through `movements-2023-05.json` (partial May)

**Script**: `scripts/file1-extraction/extract-v1.ts`

**Logic**:
1. Open workbook, iterate sheets: `["123", "223", "323", "423", "523 - 1"]`
2. For each sheet:
   - Find header row (row with "Fecha" in col B)
   - Read expenses from columns B-E starting after header
   - Read income from columns G-J starting after header
   - Skip empty rows and zero-amount rows
   - Set `account_name = "Unknown (V1 - no medio)"`
3. Group all movements by month (YYYY-MM from date)
4. Write one JSON file per month

**Edge cases**:
- Sheet 223 has dates spanning Jan-Feb → movements go to respective month files
- Sheet 323 has dates spanning Feb-Mar → same treatment
- Column A (day number) is ignored — use column B for actual date
- Some dates in 123 show 2020 — likely Excel errors. Flag with `"date_suspicious": true` if year != 2023.

**Balance extraction** (for snapshots):
- From sheets 123, 223, 323: read rows 0-1 for Saldo inicial/final
- Output to a separate `balances-v1.json` for Wave 4 to consume

---

### Wave 3: Extract V1.5 and V2 Sheets (523-2 through 12723)

**Task**: Parse V1.5, V2 Standard, and V2 Extended sheets for 2023 data.

**Input**: `.agents/resources/Presupuesto mensual.xlsx`
**Output**: Append to `movements-2023-05.json` through `movements-2023-12.json`

**Script**: `scripts/file1-extraction/extract-v2.ts`

**Sub-tasks by sheet**:

#### V1.5: `523 - 2`, `623 - 1`
- Header at row 2. Expenses: B-F. Income: H-L.
- Medio in col F (expenses), L (income) — may be empty.

#### V2 Standard: `623 - 2`, `823`, `9-1023`, `1223`
- Header at row 2. Expenses: B-F. Income: H-K.
- No income category (set null).
- Include Reset entries with `is_reset: true`.

**823 multi-section handling**:
- After initial data block ends (empty rows), scan for next "Fecha" header.
- Parse second section with same column mapping.

**9-1023 fixed expense columns**:
- After parsing main B-K columns, also parse:
  - Cols M, N, O (group 1)
  - Cols Q, R, S (group 2)  
  - Cols U, V, W (group 3)
- These are expenses: `source_section = "Fijos"`, category = col O/S/W value.

#### V2 Extended: `12723`
- Detect Section B (transactions) by scanning for header row with "Fecha|Costo|Notas|Categoria|Medio".
- Detect Section C (fijos) by finding second header pattern.
- Parse Section B same as V2 Standard.
- Parse Section C: expenses B-E, income G-J. Medio = fixed expense name → use as category.

**Date filtering**: For sheets 1223 and 12723, ONLY include rows where `date.startsWith("2023")`.

**Deduplication**: After all sheets parsed, deduplicate within each month by `(date + amount + description + account_name)`. Keep first occurrence.

---

### Wave 4: Extract Net Worth Snapshots

**Task**: Produce monthly net worth snapshots for all of 2023.

**Input**: 
- `balances-v1.json` (from Wave 2)
- All `movements-2023-*.json` files (from Waves 2-3)
- Raw Reset entries from 1223

**Output**: `snapshots-file1.json`

**Script**: `scripts/file1-extraction/extract-snapshots.ts`

**Logic**:
1. **Jan-Mar 2023**: Use Saldo final from V1 sheets (123, 223, 323).
   - Single total, no per-account breakdown.
2. **Dec 2023**: Use Reset entries from sheet 1223 (dated 2023-12-07).
   - Per-account breakdown available.
3. **Apr-Nov 2023**: Derive using running balance.
   - Start from Mar 2023 Saldo final.
   - For each month: `previous_total + sum(income) - sum(expenses)` (excluding Resets).
   - Mark as `"derived": true`.

**Output format**:
```json
[
  {
    "date": "2023-01-31",
    "total_value": 1605000,
    "currency": "COP",
    "derived": false,
    "source": "Sheet 123 - Saldo final",
    "breakdown": {"accounts": [{"name": "Total (no breakdown)", "value": 1605000}]}
  },
  ...
]
```

---

### Wave 5: Validation Script

**Task**: Validate all JSON output files for correctness and completeness.

**Script**: `scripts/file1-extraction/validate.ts`

**Checks**:
1. **File existence**: All 12 monthly files exist + snapshots file.
2. **Schema validation**: Every movement has required fields, correct types.
3. **Date range**: No movement has a date outside 2023. No date outside its file's month.
4. **Amount sanity**: No amounts > 100,000,000 (likely parsing error). No negative amounts (should be absolute).
5. **Duplicate detection**: Report potential duplicates across months.
6. **Coverage report**:
   - Total movements per month
   - Total income vs expenses per month
   - Count by account_name (spot unmapped ones)
   - Count of Reset entries
   - Count of "Unknown" account entries
7. **Snapshot validation**:
   - 12 snapshots exist (one per month)
   - Values are positive
   - Derived snapshots are flagged
8. **Cross-check**: For months with both Reset data and derived snapshots, compare values.

**Output**: Print summary table to console + write `validation-report.json`.

---

## 6. Execution Notes

### Dependencies to install
```bash
npm install xlsx --save-dev  # or add to scripts package
```

### Running order
```bash
# Wave 1: utilities (no standalone run)
# Wave 2:
npx ts-node scripts/file1-extraction/extract-v1.ts
# Wave 3:
npx ts-node scripts/file1-extraction/extract-v2.ts
# Wave 4:
npx ts-node scripts/file1-extraction/extract-snapshots.ts
# Wave 5:
npx ts-node scripts/file1-extraction/validate.ts
```

### Output directory structure
```
.agents/resources/output/file1/
├── movements-2023-01.json
├── movements-2023-02.json
├── movements-2023-03.json
├── movements-2023-04.json
├── movements-2023-05.json
├── movements-2023-06.json
├── movements-2023-07.json
├── movements-2023-08.json
├── movements-2023-09.json
├── movements-2023-10.json
├── movements-2023-11.json
├── movements-2023-12.json
├── snapshots-file1.json
├── balances-v1.json (intermediate, used by Wave 4)
└── validation-report.json
```

---

## Sources

- [Analysis File 1](/local/home/jdrami/finance-app/.agents/resources/analysis-file1.md) — accessed 2026-05-24
- [Presupuesto mensual.xlsx](/local/home/jdrami/finance-app/.agents/resources/Presupuesto mensual.xlsx) — source data
