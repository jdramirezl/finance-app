# Analysis: Presupuesto Mensual 2025.xlsx

**File**: Colombia 2025 budget (Jan–Aug 2025, COP currency)
**Sheets**: 16 total
**Sheet names**: Resumen, PresupuestosV2, Party, September, October, November, December, January, February, March, April, May, June, July, Orlando_Agosto, August

## Executive Summary

- **Active months with data**: January through August 2025 (8 months) + partial September
- **Empty months**: October, November, December (template sheets, no data)
- **Special sheets**: Party (expense splitting), Orlando_Agosto (trip expense tracker), PresupuestosV2 (budget allocation), Resumen (dashboard)
- **Currency**: COP (Colombian Peso), with some USD amounts in Orlando trip and VOO investments
- **No "Categoria" column**: Confirmed dropped. The 4th column in each section serves as the account/pocket name (for Gastos/Ingresos) or fixed expense category (for Gastos Fijos/Ingresos Fijos)
- **No "Medio" column header**: The concept of "Medio" (payment method/account) is the 4th column in each section but has no header row

---

## Month Sheet Structure (Jan–Aug)

### Layout

All month sheets (January through August) share the **same structure**:

- **Row 0**: Empty
- **Row 1**: Section headers (4 sections side by side)
- **Row 2**: Empty (separator)
- **Row 3+**: Data rows

### Section Positions (consistent across all months)

| Section | Header Col | Date Col | Amount Col | Description Col | Account/Category Col |
|---------|-----------|----------|------------|-----------------|---------------------|
| Gastos | C (col 2) | C (col 2) | D (col 3) | E (col 4) | F (col 5) |
| Ingresos | H (col 7) | H (col 7) | I (col 8) | J (col 9) | K (col 10) |
| Gastos Fijos | M (col 12) | M (col 12) | N (col 13) | O (col 14) | P (col 15) |
| Ingresos Fijos | R (col 17) | R (col 17) | S (col 18) | T (col 19) | U (col 20) |

### Column Schema Per Section

Each section has exactly **4 data columns** (no 5th column):

```
Col+0: Date (Excel serial number, type 'n')
Col+1: Amount (number, COP)
Col+2: Description (string)
Col+3: Account/Category (string)
```

### Date Format

Dates are stored as **Excel serial numbers** (type 'n'). Conversion formula:
```javascript
const date = new Date((serial - 25569) * 86400 * 1000);
```

Key reference points:
- 45659 = 2025-01-02
- 45691 = 2025-02-03
- 45719 = 2025-03-03
- 45749 = 2025-04-02
- 45779 = 2025-05-02
- 45809 = 2025-06-01
- 45840 = 2025-07-02
- 45870 = 2025-08-01

**Exception**: Some dates are strings (e.g., "30/2/24" in February Ingresos row 3) — these are typos/manual entries.

### Sample Data Row (January, Gastos section)

```
Row 3: date=45659 amount=76700 desc="desayuno juan valdez" account="[Nu] Viajes"
```

### Sample Data Row (January, Gastos Fijos section)

```
Row 3: date=45659 amount=157700 desc="tanqueada" category="GASOLINA"
```

### Sample Data Row (January, Ingresos Fijos section)

```
Row 3: date=45659 amount=42900 desc="cambio de planilla" category="CELULAR"
```

---

## Data Volume Per Month

| Month | Gastos | Ingresos | Gastos Fijos | Ingresos Fijos | Date Range |
|-------|--------|----------|--------------|----------------|------------|
| January | 68 | 49 | 17 | 29 | Jan 2 – Jan 30 |
| February | 17 | 20 | 6 | 15 | Feb 3 – Feb 28 |
| March | 53 | 55 | 18 | 14 | Mar 3 – Mar 29 |
| April | 57 | 50 | 19 | 16 | Apr 2 – Apr 28 |
| May | 36 | 51 | 11 | 17 | May 2 – May 27 |
| June | 54 | 50 | 12 | 16 | Jun 1 – Jun 25 |
| July | 41 | 19 | 21 | 17 | Jul 2 – Aug 1 |
| August | 63 | 17 | 9 | 18 | Aug 1 – Aug 20 |
| September | 22 | 6 | 2 | 0 | No dates (partial) |

---

## Structural Differences Between Months

### Consistent (Jan–Aug)
- Same 4-section layout
- Same column positions (cols 2-5, 7-10, 12-15, 17-20)
- Same data format (serial date, number amount, string desc, string account)
- All start at row 3

### September is Different
- **No dates** in any section — date column is empty
- **Sparse data** — only 22 Gastos, 6 Ingresos, 2 Gastos Fijos, 0 Ingresos Fijos
- **"done" used as account value** — indicates completed/paid status instead of account name
- **No Ingresos Fijos data at all**
- Appears to be a transitional month (user moved to Mexico in October)

### October–December
- Template sheets with headers only, zero data rows

### Quirks Found
- **April Gastos**: Some rows use "-" as account (placeholder/unknown)
- **July Gastos**: "Done" used as account value (status marker)
- **August**: "n/a" and "n/a devoluacion" used as account values
- **Some Ingresos rows**: Missing date in col+0 but have amount in col+1 (date on a different row above)

---

## Account Names (Col+3 in Gastos/Ingresos)

These are the pocket/account names used in the finance app:

### Real Accounts/Pockets
```
[Nu] Ahorros
[Nu] Viajes
[Nu] Para gastar
[Nu] Emergencias
[Nu] Regalos
[Bancolombia] Ahorros
[Bancolombia] Viajes
[Bancolombia]  Para gastar    (note: double space before "Para")
[Bancolombia]  Fijos          (note: double space before "Fijos")
Efectivo
Tarjeta de Alimentacion
VOO
VOO SHARES
CDT
```

### Status/Placeholder Values (not real accounts)
```
-           (unknown/placeholder)
Done / done (paid/completed marker)
n/a         (not applicable)
n/a devoluacion (refund not applicable)
No paga     (doesn't pay)
No pedi     (didn't order)
ya          (already done)
```

---

## Fixed Expense Categories (Col+3 in Gastos Fijos/Ingresos Fijos)

These are uppercase category names for recurring expenses:

```
BARBERIA
CELULAR
CREMAS
GASOLINA
GIMNASIA
GUITARRA
GYM
IMPUESTO
INTERNET
PARQUEADERO
RAPPI
SEGURO
SOAT
SPOTIFY
VERO
```

---

## "Cambio de Planilla" Entries

### What They Are

"Cambio de planilla" (or "cambio de plan") entries are **balance initialization records** when switching from the previous year's file (2024) to this 2025 file. They represent the starting balances carried over.

### Characteristics
- **Only appear in January** (20 entries, all dated 2025-01-02)
- Found in **Ingresos** and **Ingresos Fijos** sections
- The amount represents the balance being carried forward from the 2024 file
- The account/category column shows WHERE the balance goes

### January Cambio de Planilla Data

**In Ingresos section (col 7-10):**
```
date=2025-01-02  amount=2441026     desc="cambio de planilla"  account="VOO"
date=2025-01-02  amount=43964221    desc="cambio de planilla"  account="[Nu] Ahorros"
date=2025-01-02  amount=3830383     desc="cambio de planilla"  account="[Nu] Viajes"
date=2025-01-02  amount=1752819     desc="cambio de planilla"  account="[Nu] Emergencias"
date=2025-01-02  amount=848403      desc="cambio de planilla"  account="[Nu] Regalos"
date=2025-01-02  amount=17402674    desc="cambio de planilla"  account="[Bancolombia] Viajes"
date=2025-01-02  amount=51903.33606 desc="cambio de planilla"  account="[Bancolombia]  Para gastar"
date=2025-01-02  amount=220611.5606 desc="cambio de planilla"  account="[Bancolombia] Ahorros"
date=2025-01-02  amount=35.05533    desc="cambio de planilla"  account="VOO SHARES"
date=2025-01-02  amount=30052000    desc="cambio de planilla"  account="CDT"
```

**In Ingresos Fijos section (col 17-20):**
```
date=2025-01-02  amount=42900   desc="cambio de planilla"  category="CELULAR"
date=2025-01-02  amount=15000   desc="cambio de planilla"  category="RAPPI"
date=2025-01-02  amount=10700   desc="cambio de planilla"  category="SPOTIFY"
date=2025-01-02  amount=100000  desc="cambio de planilla"  category="GYM"
date=2025-01-02  amount=250000  desc="cambio de planilla"  category="VERO"
date=2025-01-02  amount=157700  desc="cambio de planilla"  category="GASOLINA"
date=2025-01-02  amount=170000  desc="cambio de planilla"  category="PARQUEADERO"
date=2025-01-02  amount=60000   desc="cambio de planilla"  category="INTERNET"
date=2025-01-02  amount=620200  desc="cambio de planilla"  category="GIMNASIA"
date=2025-01-02  amount=100000  desc="cambio de planilla"  category="BARBERIA"
```

### Migration Implication

These should be treated as **initial balance entries** or skipped entirely if the 2024 file is also being migrated. They are NOT real transactions — they're bookkeeping to start the 2025 file with correct balances.

---

## How Fixed Expenses Are Recorded

### Structure

Fixed expenses use two paired sections:
1. **Gastos Fijos** — actual payments made toward fixed expenses
2. **Ingresos Fijos** — budget allocations (salary portions assigned to each category)

### Gastos Fijos (Actual Payments)

Each row records an actual payment for a fixed expense:
```
date=45659  amount=157700  desc="tanqueada"       category="GASOLINA"
date=45659  amount=8800    desc="spotify"         category="SPOTIFY"
date=45659  amount=42900   desc="tigo"            category="CELULAR"
date=45660  amount=125000  desc="cetar"           category="GYM"
date=45668  amount=60000   desc="somos"           category="INTERNET"
date=45710  amount=460000  desc="soat"            category="SOAT"
date=45784  amount=2718000 desc="SEGURO CARRO"    category="SEGURO"
```

### Ingresos Fijos (Budget Allocations)

Each row records money allocated FROM salary TO a fixed expense category:
```
date=45741  amount=45900   desc="salario"  category="CELULAR"
date=45741  amount=15000   desc="salario"  category="RAPPI"
date=45741  amount=8800    desc="salario"  category="SPOTIFY"
date=45741  amount=95000   desc="salario"  category="GYM"
date=45741  amount=250000  desc="salario"  category="VERO"
date=45741  amount=160000  desc="salario"  category="GASOLINA"
```

### Description Patterns in Ingresos Fijos
- `"salario"` or `"SALARIO"` — monthly salary allocation
- `"diff"` or `"dif"` or `"dff"` — difference/adjustment
- `"Recupero!"` — recovery of overpayment
- `"cambio de planilla"` — initial balance from previous file

### How the System Works

The fixed expense "pocket" accumulates money via Ingresos Fijos (salary allocations) and is spent via Gastos Fijos (actual payments). The balance = sum(Ingresos Fijos) - sum(Gastos Fijos) for each category.

---

## Resumen (Summary) Sheet

### Overview
- **Range**: A1:O64 (only 64 rows have data despite 1991 row range)
- **Purpose**: Dashboard showing current balances, totals, fixed expense status, and per-account income/expense totals

### Structure (3 panels side by side)

#### Left Panel (Cols A-C): Account Balances

Organized by bank/group with "H" flag marking group headers:

```
Row 1:  H  Totales              122,166,762.60 COP
Row 2:     Inversiones           88,428,479.97
Row 3:     Dolares                         469 (USD amount)
Row 4:     Bancolombia           17,675,188.90
Row 5:     Efectivo               2,075,000
Row 6:     Otros                     100,659
Row 7:     Nubank                12,161,708.86

Row 9:  H  Otros (group)
Row 10:    Nequi                           0
Row 11:    Tarjeta de Alimentacion   100,659
Row 12:    Dolares                       469

Row 14: H  Efectivo (group)
Row 15:    Efectivo               2,075,000

Row 17: H  Nubank (group)
Row 18:    [Nu] Ahorros                    0
Row 19:    [Nu] Viajes            1,064,264.59
Row 20: H  [Nu] Fijos             3,836,475.36
Row 21:    [Nu] Para gastar                0
Row 22:    [Nu] Emergencias       7,260,968.90  (col D: 8,420,989.09 = target)
Row 23:    [Nu] Regalos             848,403

Row 25: H  Bancolombia (group)
Row 26:    [Bancolombia] Ahorros    220,611.56
Row 27:    [Bancolombia] Viajes  17,402,674
Row 28:    [Bancolombia]  Fijos            0
Row 29:    [Bancolombia]  Para gastar 51,903.34

Row 31: H  Inversiones (group)
Row 32:    VOO                    19,399.32 (USD)  col D: 71,381,467.45 (COP)
Row 33:    VOO SHARES             35.05533
Row 34: H  DELTA                   0.2388156637
Row 35: h  DIFF                    4,632.86      col D: 17,047,012.53
Row 36: h  TOTAL VOO             24,032.18      col D: 88,428,479.97
Row 37:    CDT                             0
```

#### Middle Panel (Cols E-I): Fixed Expenses Status

```
Row 1:  Fijos          3,836,475.36 (total monthly fixed)
Row 2:  CELULAR           45,900    45,900
Row 3:  RAPPI             15,000    15,000
Row 4:  SPOTIFY           10,700    10,700
Row 5:  GYM              100,000   100,000
Row 6:  VERO             250,000   250,000
Row 7:  GASOLINA          17,100   180,000
Row 8:  PARQUEADERO       49,394    80,000
Row 9:  SOAT             321,181   500,000
Row 10: SEGURO         1,372,909 3,000,000
Row 11: IMPUESTO         578,091   700,000
Row 12: GIMNASIA         620,200   620,200
Row 13: INTERNET          60,000    60,000
Row 14: BARBERIA         100,000   100,000
Row 15: CREMAS            96,000   160,000
Row 16: GUITARRA         200,000   200,000
```

Col F = current saved amount, Col G = target amount

#### Right Panel (Cols K-O): Income/Expense Totals Per Account

```
         Ingresos              Gastos
Nequi              0           Nequi              0
Tarjeta Alim  1,409,919       Tarjeta Alim  1,309,260
Dolares              0        Dolares              0
Efectivo      6,919,747       Efectivo      4,844,747
[Nu] Ahorros 91,271,003       [Nu] Ahorros 91,271,003
[Nu] Viajes  21,067,235       [Nu] Viajes  20,002,971
[Nu] Para g   2,559,447       [Nu] Para g   2,559,447
[Nu] Emerg   25,825,248       [Nu] Emerg   18,564,279
[Nu] Regalos  2,128,403       [Nu] Regalos  1,280,000
[Banco] Ahor 26,291,457       [Banco] Ahor 26,070,846
[Banco] Viaj 22,837,941       [Banco] Viaj  5,435,267
[Banco] Fijos        0        [Banco] Fijos        0
[Banco] Gast 10,295,110       [Banco] Gast 10,243,207
VOO          41,428,395       VOO          41,408,996
VOO SHARES       35.055       VOO SHARES           0
CDT          30,052,000       CDT          30,052,000
```

### Key Observations
- Resumen is a **calculated dashboard** (formulas reference month sheets)
- No monthly breakdown in Resumen — it shows cumulative totals
- VOO investment tracked in both USD (shares) and COP (converted value)
- Exchange rate (DELTA) stored for USD→COP conversion
- The "H" and "h" flags in col A are used for visual grouping/formatting

---

## PresupuestosV2 Sheet (Budget Planning)

### Overview
- **Range**: B1:S43
- **Purpose**: Budget allocation planning with projections and fixed expense breakdown

### Structure (3 panels)

#### Left Panel (Cols B-G): Projections

```
Row 3:  "Proyeccion"
Row 4:  Headers: "", "Hoy + Plazo", "Valor", "Plazo", "Total"
Row 7:  Ahorros       45839    0         12    0
Row 8:  Inversion     46531    3,825,837  12    45,910,054
Row 9:  Viajes        46350    1,912,918   6    11,477,513
Row 10: Entretenimiento 46531  1,300,784  12    15,609,418
```

"Hoy + Plazo" = Excel serial date (target date), "Plazo" = months, "Total" = projected total

#### Left Panel (Rows 13-25): Percentage Allocation

```
Row 14: Headers: "", "", "Porc", "Total", "Restante"
Row 16: Saldo inicial:    0    8,259,000   8,259,000
Row 17: Gastos fijos      0.0735  607,324   7,651,675
Row 20: Porcentaje total  1    7,651,675
Row 21: Ahorros           0       0         7,651,675
Row 22: Inversiones       0.50    3,825,837  3,825,837
Row 23: Emergencia        0.08    612,134    3,213,703
Row 24: Viajes            0.25    1,912,918  1,300,784
Row 25: Entretenimiento   0.17    1,300,784  0
```

#### Middle Panel (Cols I-J): Category Totals

```
Row 5:  Totales         607,324
Row 7:  Subscripciones    0
Row 8:  Carro           575,324
Row 9:  Salud            32,000
Row 10: Otros                0
Row 11: Clases               0
```

#### Right Panel (Cols L-S): Fixed Expense Detail

```
Headers: Gastos, [amount], Porc, Duracion, Total, Ciclo, Tipo, [monthly]
Row 7:  CELULAR     45,900   1    0      27/mes   Subscripciones  45,900
Row 8:  RAPPI       15,000   1    0       2/mes   Subscripciones  15,000
Row 9:  SPOTIFY     10,700   1    0       3/mes   Subscripciones  10,700
Row 10: GYM        100,000   1    0               Clases         100,000
Row 11: VERO       250,000   1    0               Otros          250,000
Row 12: GASOLINA   180,000   1    162,900          Carro          180,000
Row 13: PARQUEADERO 80,000   1    30,606           Carro           80,000
Row 14: SOAT       500,000  11    45,454  3/mar/yr Carro           45,454
Row 15: SEGURO   3,000,000  11   272,727  10/mayo/yr Carro        272,727
Row 16: IMPUESTO   700,000  11    63,636  5/enero/yr Carro         63,636
Row 17: GIMNASIA   620,200   2.5       0           Clases         248,080
Row 18: INTERNET    60,000   1         0  11/mes   Subscripciones  60,000
Row 19: BARBERIA   100,000   2         0           Salud           50,000
Row 20: CREMAS     160,000   5    32,000           Salud           32,000
Row 21: GUITARRA   200,000   1         0           Clases         200,000
```

**Column meanings:**
- `Gastos`: Expense name (matches fixed expense categories)
- `[amount]`: Total annual/period cost
- `Porc` (Duracion): Payment frequency multiplier (1=monthly, 11=annual spread over 11 months, 2.5=every 2.5 months)
- `Duracion` (col 14): Current saved amount toward this expense
- `Total` (col 15): Monthly contribution needed
- `Ciclo`: Payment cycle description (e.g., "27/mes" = 27th of month, "3/mar/yr" = March yearly)
- `Tipo`: Category grouping (Subscripciones, Carro, Salud, Clases, Otros)
- Last col: Effective monthly amount

---

## Party Sheet

### Overview
- **Range**: A1:J1000 (but only ~37 rows with data)
- **Purpose**: Expense splitting calculator for a party (16 people)

### Structure
- **Left side (Col A)**: List of 16 attendees (camila, julian, phillip, jose, sofi, majo, mono, vivi, juanda, mariana, drew, cari, stefa, gavo, david, rudy)
- **Right side (Cols G-J)**: Shopping list with columns: cosa (item), precio (price), ctd (quantity), tot (total)
- **Summary**: Total = 379,400 COP, per person = 23,712.50 COP

### Items Purchased
```
Guaro azul (48000 x 2), Vodka Smirnoff Lulo (45000 x 2), Dorada Club Colombia (84000 x 1),
Sprite (8000), Jugo del valle (3000), Naranjas (2000), Limon (7000), hielo (5000),
gelatina con sabor (1000 x 8), gomitas (5000), Mega lonchera paquetes papas (25000 x 2),
aguas (1000), vaso para shot (5400), platos desechables (5000), vasos (5000),
vasos de salsa para jello (5000)
```

### Migration Relevance
**None** — this is a one-off party expense calculator, not a financial transaction record. Skip during migration.

---

## Orlando_Agosto Sheet (Orlando Trip - August)

### Overview
- **Range**: A1:M995 (83 non-empty rows)
- **Purpose**: Detailed expense tracker for an Orlando, Florida trip in August 2025

### Structure

#### Header (Row 7)
Day columns: miercoles, viernes, sabaod (sábado), domingo, lunes, martes

#### Expense Table (Rows 11-59)
```
Headers (Row 11): cosa | valor | ctd | total | con cambio | [owner] | [notes]
```

- **cosa**: Item description
- **valor**: Price (mixed COP and USD)
- **ctd**: Quantity (divisor — usually 2 for split with travel partner)
- **total**: Per-person amount
- **con cambio**: Amount converted to COP (when original is USD)
- **Col G**: Owner/debt marker: "mio", "debo a gordo", "gordo me debe a mi", "vero me debe a mi"
- **Col H**: Notes (payment method like "nubank")

#### Exchange Rate
- Row 10, Col F: 32,543,018.23 (likely a reference value)
- Row 19-20: Shows conversion calculations (USD → COP with rate ~3,679.59)

#### Debt Summary (Rows 62-63)
```
gordo me debe: 3,412,838
debo a gordo:  1,384,959
Net (gordo owes): 2,027,878
```

#### Credit Card Breakdown (Rows 77-101)
Lists expenses by card (visa infinite vs mastercard black) for reconciliation.

### Sample Expenses
```
hotel yo: 1,881,630 COP
walmart: 345,130 / 2 = 172,565
zapatos sketchers: 405,647 (mio)
compra ross: 645,076 (mio) — medias, boxers, gafas, maleta, buzo spiderman
pantalon levis: 284,201 (mio)
busch gardens tickets + comida: 2,169,175 (gordo me debe)
busch gardens fast passes: 1,476,827 (gordo me debe)
hampton habitacion nosotros: 1,998,095 (mio)
```

### Migration Relevance
**Partial** — The "mio" items could be extracted as expenses from the user's accounts. The debt tracking (gordo me debe / debo a gordo) represents IOUs. This sheet doesn't follow the standard month format and would need special handling.

---

## Extraction Script Guidance

### Standard Month Extraction (Jan–Aug)

```javascript
// For each month sheet:
const SECTIONS = [
  { name: 'Gastos',        startCol: 2,  type: 'expense' },
  { name: 'Ingresos',      startCol: 7,  type: 'income' },
  { name: 'Gastos Fijos',  startCol: 12, type: 'fixed_expense' },
  { name: 'Ingresos Fijos', startCol: 17, type: 'fixed_income' },
];

// For each section, read rows starting at row 3:
// col+0 = date (serial number → convert)
// col+1 = amount (number)
// col+2 = description (string)
// col+3 = account/category (string)

// Skip rows where BOTH amount AND description are empty
// Date may be missing on some rows (inherit from previous row with date)
// Filter out "cambio de planilla" entries (or flag as initial_balance)
```

### Key Decisions for Migration

1. **"cambio de planilla" entries**: Skip or import as `type: 'initial_balance'`
2. **Status values as accounts** ("-", "Done", "n/a"): Map to a default account or skip
3. **Missing dates**: Inherit from the nearest row above with a date, or use month start
4. **September partial data**: Include but flag as incomplete
5. **Orlando_Agosto**: Extract "mio" items as expenses, or skip entirely
6. **Party sheet**: Skip entirely
7. **PresupuestosV2**: Use for fixed expense configuration, not transaction extraction
8. **Resumen**: Use for validation (compare extracted totals against summary)

### Account Name Mapping

The account names in the Excel need to map to finance-app accounts:

```javascript
const ACCOUNT_MAP = {
  // Nubank pockets
  '[Nu] Ahorros': { account: 'Nubank', pocket: 'Ahorros' },
  '[Nu] Viajes': { account: 'Nubank', pocket: 'Viajes' },
  '[Nu] Para gastar': { account: 'Nubank', pocket: 'Para gastar' },
  '[Nu] Emergencias': { account: 'Nubank', pocket: 'Emergencias' },
  '[Nu] Regalos': { account: 'Nubank', pocket: 'Regalos' },
  // Bancolombia pockets
  '[Bancolombia] Ahorros': { account: 'Bancolombia', pocket: 'Ahorros' },
  '[Bancolombia] Viajes': { account: 'Bancolombia', pocket: 'Viajes' },
  '[Bancolombia]  Fijos': { account: 'Bancolombia', pocket: 'Fijos' },
  '[Bancolombia]  Para gastar': { account: 'Bancolombia', pocket: 'Para gastar' },
  // Standalone accounts
  'Efectivo': { account: 'Efectivo', pocket: null },
  'Tarjeta de Alimentacion': { account: 'Tarjeta de Alimentacion', pocket: null },
  'VOO': { account: 'Inversiones', pocket: 'VOO' },
  'VOO SHARES': { account: 'Inversiones', pocket: 'VOO SHARES' },
  'CDT': { account: 'Inversiones', pocket: 'CDT' },
  'Nequi': { account: 'Nequi', pocket: null },
};
```

### Fixed Expense Category → SubPocket Mapping

```javascript
const FIXED_EXPENSE_MAP = {
  'CELULAR': { group: 'Subscripciones', amount: 45900, cycle: 'monthly' },
  'RAPPI': { group: 'Subscripciones', amount: 15000, cycle: 'monthly' },
  'SPOTIFY': { group: 'Subscripciones', amount: 10700, cycle: 'monthly' },
  'GYM': { group: 'Clases', amount: 100000, cycle: 'monthly' },
  'VERO': { group: 'Otros', amount: 250000, cycle: 'monthly' },
  'GASOLINA': { group: 'Carro', amount: 180000, cycle: 'monthly' },
  'PARQUEADERO': { group: 'Carro', amount: 80000, cycle: 'monthly' },
  'SOAT': { group: 'Carro', amount: 500000, cycle: 'yearly_march' },
  'SEGURO': { group: 'Carro', amount: 3000000, cycle: 'yearly_may' },
  'IMPUESTO': { group: 'Carro', amount: 700000, cycle: 'yearly_jan' },
  'GIMNASIA': { group: 'Clases', amount: 620200, cycle: 'every_2.5_months' },
  'INTERNET': { group: 'Subscripciones', amount: 60000, cycle: 'monthly' },
  'BARBERIA': { group: 'Salud', amount: 100000, cycle: 'every_2_months' },
  'CREMAS': { group: 'Salud', amount: 160000, cycle: 'every_5_months' },
  'GUITARRA': { group: 'Clases', amount: 200000, cycle: 'monthly' },
};
```

---

## Sources

- Direct analysis of `/local/home/jdrami/finance-app/.agents/resources/Presupuesto Mensual 2025.xlsx` — accessed 2026-05-24
