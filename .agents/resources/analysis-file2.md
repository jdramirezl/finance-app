# Deep Analysis: Shin Presupuesto Mensual 2024.xlsx

## Executive Summary

This is a 2024 personal finance tracking spreadsheet in COP (Colombian Peso). It contains 14 sheets: 12 monthly sheets (January–December), 1 summary sheet (Resumen), and 1 budget planning sheet (PresupuestosV2).

**Key structural facts:**
- All month sheets have 4 side-by-side sections: Gastos, Ingresos, Gastos Fijos, Ingresos Fijos
- Sections are arranged horizontally (not stacked vertically)
- Section titles are in Row 1, headers in Row 2, data starts Row 3
- December is offset by +1 column compared to all other months
- A "Resumen final" section exists at the rightmost columns (account balances + fixed expense tracking)
- The "Categoria" column exists in Gastos headers but is mostly empty (only used in some months)
- The "Medio" column represents the account/pocket the money came from or went to

---

## File Overview

- **Currency:** COP (Colombian Peso)
- **Period:** January – December 2024
- **Location:** Colombia
- **Total Sheets:** 14

### Sheet List

1. Resumen (summary dashboard)
2. PresupuestosV2 (budget planning)
3. November
4. October
5. June
6. July
7. August
8. September
9. January
10. February
11. March
12. April
13. May
14. December

---

## Month Sheet Layout

All month sheets (except December) share this structure:

```
Range: B1:V1000 (or B1:W1000 for Jan-May)
Row 0: empty
Row 1: Section titles
Row 2: Column headers
Row 3+: Data
```

### Section Positions (Jan–Nov)

| Section | Title Col | Columns Span |
|---------|-----------|--------------|
| Gastos | 0 | 0–4 |
| Ingresos | 6 | 6–9 |
| Gastos Fijos | 11 | 11–14 |
| Ingresos Fijos | 16 | 16–19 |
| Resumen final | 20 | 20–21 |

### Section Positions (December ONLY — shifted +1)

| Section | Title Col | Columns Span |
|---------|-----------|--------------|
| Gastos | 1 | 1–5 |
| Ingresos | 7 | 7–10 |
| Gastos Fijos | 12 | 12–15 |
| Ingresos Fijos | 17 | 17–20 |
| Resumen final | 21 | 21–22 |

---

## Section Column Mappings

### Gastos (Expenses)

| Offset | Header | Content |
|--------|--------|---------|
| 0 | Fecha | Date (Excel serial number) |
| 1 | Costo | Amount (positive number) |
| 2 | Notas | Description/notes |
| 3 | Categoria | Category (often empty) |
| 4 | Medio | Account/pocket name |

### Ingresos (Income)

| Offset | Header | Content |
|--------|--------|---------|
| 0 | Fecha | Date (Excel serial number) |
| 1 | Ingreso | Amount |
| 2 | Notas | Description/notes |
| 3 | Medio | Account/pocket name |

### Gastos Fijos (Fixed Expenses)

| Offset | Header | Content |
|--------|--------|---------|
| 0 | Fecha | Date (Excel serial number) |
| 1 | Costo | Amount (often negative) |
| 2 | Notas | Description (e.g., "spotify", "vero") |
| 3 | Medio | Fixed expense NAME (e.g., "SPOTIFY", "GYM") |

### Ingresos Fijos (Fixed Income)

| Offset | Header | Content |
|--------|--------|---------|
| 0 | Fecha | Date (Excel serial number) |
| 1 | Costo | Amount |
| 2 | Notas | Description |
| 3 | Medio | Fixed expense NAME (same as Gastos Fijos) |

---

## Data Row Counts Per Month

| Month | Gastos | Ingresos | Gastos Fijos | Ingresos Fijos |
|-------|--------|----------|--------------|----------------|
| January | 30 | 6 | 4 | 6 |
| February | 3 | 8 | 20 | 15 |
| March | 39 | 4 | 15 | 15 |
| April | 1 | 6 | 9 | 5 |
| May | 15 | 13 | 1 | 15 |
| June | 57 | 21 | 5 | 0 |
| July | 2 | 6 | 18 | 31 |
| August | 42 | 13 | 13 | 2 |
| September | 4 | 3 | 9 | 17 |
| October | 26 | 13 | 14 | 11 |
| November | 3 | 2 | 5 | 12 |
| December | 29 | 5 | 8 | 3 |

**Note:** Some months have very few Gastos rows (Feb=3, Apr=1, Jul=2) — likely incomplete data entry.


---

## Sample Data (January)

### Gastos Sample

```
Row 3: Fecha=2024-01-15, Costo=150000, Notas="tanqueada carro vero", Categoria=null, Medio=null
Row 4: Fecha=2024-01-17, Costo=33800, Notas="comida con drew", Categoria=null, Medio=null
Row 5: Fecha=null, Costo=4200, Notas="parqueadero ssura", Categoria=null, Medio=null
Row 7: Fecha=2024-01-18, Costo=40000, Notas="cine", Categoria=null, Medio=null
Row 8: Fecha=2024-01-18, Costo=202000, Notas="lampara vero", Categoria=null, Medio=null
```

**Observations:**
- Fecha can be null (row inherits date from above or is same-day)
- Categoria is empty in January
- Medio is empty in January
- Costo is always a positive number

### Gastos Sample (November — has Medio populated)

```
Row 3: Fecha=2024-11-04, Costo=458575, Notas="GaTech pago", Categoria=null, Medio="[Nu] Ahorros"
Row 4: Fecha=2024-11-04, Costo=21400, Notas="Spotify", Categoria=null, Medio="[Nu] Ahorros"
Row 5: Fecha=2024-11-04, Costo=30000, Notas="diff", Categoria=null, Medio="[Bancolombia]  Para gastar"
Row 7: Fecha=2024-11-04, Costo=129000, Notas="diff", Categoria=null, Medio="Efectivo"
Row 8: Fecha=2024-11-05, Costo=40000, Notas="cine", Categoria=null, Medio="[Bancolombia]  Para gastar"
```

### Gastos Sample (December — has Medio, shifted +1 col)

```
Row 3: Fecha=2024-12-01, Costo=286000, Notas="diff", Categoria=null, Medio="Efectivo"
Row 4: Fecha=2024-12-01, Costo=220000, Notas="plata gordo deuda viaje", Categoria=null, Medio="Efectivo"
Row 5: Fecha=2024-11-29, Costo=17600, Notas="spotify", Categoria=null, Medio="[Nu] Ahorros"
Row 6: Fecha=2024-12-01, Costo=82600, Notas="medicamentos", Categoria=null, Medio="[Nu] Ahorros"
```

### Ingresos Sample (June)

```
Row 3: Fecha=2024-06-06, Ingreso=4400, Notas="carly", Medio="Para gastar"
Row 4: Fecha=2024-06-06, Ingreso=4400, Notas="vivi", Medio="Para gastar"
Row 8: Fecha=2024-06-14, Ingreso=2200000, Notas="cami Disney + Universal", Medio="Ahorros"
Row 9: Fecha=null, Ingreso=667994.5, Notas="Universal cami", Medio=null
Row 12: Fecha=2024-06-04, Ingreso=50000, Notas="gordo pago", Medio="Efectivo Para gastar"
```

**Observations:**
- Ingresos rows without Fecha/Medio are sub-items of the row above
- Medio represents which account/pocket received the income

### Gastos Fijos Sample (January)

```
Row 3: Fecha=2024-01-25, Costo=-350000, Notas="vero", Medio=null (but col 14 not populated in Jan)
Row 4: Fecha=2024-01-29, Costo=-88000, Notas="GYM", Medio=null
Row 5: Fecha=2024-01-29, Costo=-18000, Notas="vero", Medio=null
Row 6: Fecha=null, Costo=-13000, Notas="UBER", Medio=null
```

### Gastos Fijos Sample (November — Medio populated)

```
Row 3: Fecha=2024-11-04, Costo=10700, Notas="spotify", Medio="SPOTIFY"
Row 4: Fecha=2024-11-11, Costo=88000, Notas=null, Medio="GASOLINA"
Row 5: Fecha=2024-11-15, Costo=?, Notas=null, Medio="CELULAR"
Row 6: Fecha=2024-11-15, Costo=17840, Notas="uber juandi", Medio="PARQUEADERO"
```

**Key insight for Gastos Fijos:**
- The "Medio" column here is NOT an account — it's the fixed expense CATEGORY NAME
- In early months (Jan), the Notas field contains what later becomes the Medio value
- Costo can be negative (Jan) or positive (Nov) — inconsistent sign convention

### Ingresos Fijos Sample (January)

```
Row 3: Fecha=2024-01-24, Costo=34500, Notas="CELULAR", Medio=null (col 19 not in Jan range)
Row 4: Fecha=2024-01-24, Costo=15000, Notas="RAPPI", Medio=null
Row 5: Fecha=2024-01-24, Costo=4400, Notas="SPOTIFY", Medio=null
Row 6: Fecha=2024-01-24, Costo=24000, Notas="GYM", Medio=null
Row 7: Fecha=2024-01-24, Costo=50000, Notas="UBER", Medio=null
Row 8: Fecha=2024-01-24, Costo=200000, Notas="vero", Medio=null
```

**Key insight for Ingresos Fijos:**
- These represent monthly CONTRIBUTIONS toward fixed expenses
- The Notas/Medio field contains the fixed expense name
- This is money being SET ASIDE for future fixed expense payments


---

## Structural Differences Between Months

### Column Offset

| Months | Gastos Start Col | Sheet Range |
|--------|-----------------|-------------|
| Jan–Nov | Col 0 | B1:V1000 or B1:W1000 |
| December | Col 1 | A1:V1000 |

**December is shifted +1 column.** All section positions move accordingly.

### Medio Column Population

| Months | Gastos Medio | Ingresos Medio | Gastos Fijos Medio | Ingresos Fijos Medio |
|--------|-------------|----------------|--------------------|--------------------|
| January | EMPTY | Partially filled | EMPTY (name in Notas) | EMPTY (name in Notas) |
| February–May | Partially filled | Filled | Filled | Filled |
| June–December | Filled | Filled | Filled | Filled |

**Critical:** In early months, the fixed expense name appears in the "Notas" column instead of "Medio".

### Categoria Column

The "Categoria" column (Gastos offset 3) is **mostly empty across all months**. Only a few months have sparse category data:
- Used in: Some rows in June, August, October
- Categories found: Cine, Comida, Comida rapida, Recetas, Restaurante, Salud, Snacks, Suscripcion, Tecnologia, Transporte, Viajes

### Resumen Final Section

| Months | Content |
|--------|---------|
| January | Full: account balances + fixed expense amounts |
| February–May | Full: account balances grouped by bank + investments |
| June–November | Only fixed expense names listed (no balances) |
| December | Fixed expense names with Notas |

---

## Unique Values

### Medios — Gastos (Account/Pocket for Expenses)

These represent WHERE money was spent FROM:

- Ahorros
- CDT
- Efectivo
- Efectivo Para gastar
- Para gastar
- Tarjeta de Alimentacion
- Viajes
- [Bancolombia]  Para gastar
- [Nu] Ahorros
- [Nu] Para gastar
- [Nu] Viajes

### Medios — Ingresos (Account/Pocket for Income)

These represent WHERE money was received INTO:

- Ahorros
- CDT
- Dolares
- Efectivo
- Efectivo Para gastar
- Para gastar
- Tarjeta de Alimentacion
- VOO
- Viajes
- [Bancolombia]  Para gastar
- [Nu] Ahorros
- [Nu] Emergencias
- [Nu] Para gastar
- [Nu] Viajes

### Medios — Gastos Fijos (Fixed Expense Names)

These are NOT accounts — they are fixed expense CATEGORY IDENTIFIERS:

- BARBERIA
- CELULAR
- CREMAS CABELLO
- GASOLINA
- GIMNASIA
- GYM
- LAVADO CARRO
- PARQUEADERO
- PSICOLOGIA
- RAPPI
- SPOTIFY
- UBER
- VERO

### Medios — Ingresos Fijos (Fixed Income/Contribution Names)

Same fixed expense identifiers (money being set aside):

- BARBERIA
- CELULAR
- CREMAS CABELLO
- GASOLINA
- GIMNASIA
- GYM
- IMPUESTO
- LAVADO CARRO
- PARQUEADERO
- PROTEINA
- PSICOLOGIA
- RAPPI
- SEGURO
- SOAT
- SPOTIFY
- UBER
- VERO

### Categories (Gastos only — sparse)

- Cine
- Comida
- Comida rapida
- Recetas
- Restaurante
- Salud
- Snacks
- Suscripcion
- Tecnologia
- Transporte
- Viajes

**Total unique categories:** 11 (but most rows have no category)


---

## Fixed Expense Mapping (Medio → Notas descriptions)

This shows what each fixed expense identifier represents based on the Notas field:

| Fixed Expense (Medio) | Typical Notas Values |
|----------------------|---------------------|
| BARBERIA | corte de cabello, rizos |
| CELULAR | tigo, celular |
| CREMAS CABELLO | (reduciendo categorias) |
| GASOLINA | pago gordo, gasolina |
| GIMNASIA | (empty) |
| GYM | upb |
| LAVADO CARRO | lavada de carro, lavada carro |
| PARQUEADERO | parqueadero eafit, parqueadero |
| PSICOLOGIA | (empty) |
| RAPPI | rappi, no se uso |
| SPOTIFY | spotify |
| UBER | pines xd, oficina sr vero, meli, alejo, casa |
| VERO | vero, vero a nu |

**Interpretation:**
- These are recurring monthly expenses with fixed budgeted amounts
- "Ingresos Fijos" = money set aside (contributed) toward these expenses
- "Gastos Fijos" = actual payments made for these expenses
- The difference tracks whether you're ahead or behind on each fixed expense

---

## Resumen Final Section (Per-Month Summary)

### Structure in January–May (Full)

Located at Col 20–21 (or 21–22 for December). Contains:

**Block 1: Account Totals**
```
Row 3:  "Totales" = 49577895          (total net worth)
Row 4:  "Tarjeta Debito" = 20798229   (or "Inversiones" in later months)
Row 5:  "Nequi" = 54678               (or "Dolares")
Row 6:  "Efectivo para Gastar" = 125800 (or "Bancolombia")
Row 7:  "CDT" = 27465000              (or "Efectivo")
Row 8:  "Dolares" = 200               (or "Otros")
Row 9:  "Tarjeta de Alimentacion" = 356918
Row 10: "Ahorros Efectivo" = 1040000
```

**Block 2: Sub-accounts (Bolsillos/Pockets)**
```
Row 14: "Bolsillos" = 20471855
Row 15: "Ahorros" = 11266579
Row 16: "Viajes" = 5473438
Row 17: "Fijos" = 3731838
Row 18: "Para gastar" = 326374
```

**Block 3: Fixed Expense Balances**
```
Row 20: "Fijos" (header)
Row 21: "CELULAR" = 37179
Row 22: "RAPPI" = 50000
Row 23: "SPOTIFY" = 8800
Row 24: "GYM" = 0
Row 25: "UBER" = 74300
Row 26: "vero" = 0
Row 27: "BARBERIA" = 72000
Row 28: "CREMAS CABELLO" = 51000
Row 29: "PROTEINA" = 147000
Row 30: "LAVADO CARRO" = 33600
Row 31: "GASOLINA" = 70750
Row 32: "PARQUEADERO" = 120000
Row 33: "SOAT" = 258875
Row 34: "SEGURO" = 2750000
Row 35: "IMPUESTO" = 58333
```

### Structure in February–May (Grouped by Bank)

```
Row 3:  "Totales" = total
Row 4:  "Inversiones" = total investments
Row 5:  "Dolares" = USD holdings
Row 6:  "Bancolombia" = total Bancolombia
Row 7:  "Efectivo" = cash
Row 8:  "Otros" = other

Row 10: "Otros" (sub-header)
Row 11: "Nequi" = balance
Row 12: "Tarjeta de Alimentacion" = balance

Row 14: "Efectivo" (sub-header)
Row 15: "Efectivo Ahorros" = savings cash
Row 16: "Efectivo Para gastar" = spending cash

Row 18: "Bancolombia" (sub-header)
Row 19: "Ahorros" = savings
Row 20: "Viajes" = travel pocket
Row 21: "Fijos" = fixed expenses pocket
Row 22: "Para gastar" = spending pocket

Row 25: "Inversiones" (sub-header)
Row 26: "VOO" = VOO stock value
Row 27: "CDT" = term deposit
```

### Structure in June–November (Minimal)

Only the "Ingresos Fijos" Medio column (Col 19) has data — just a list of fixed expense names without amounts. The Resumen final title exists at Col 20 but has no balance data.

### Structure in December

Same as June–November but shifted: fixed expense names in Col 20 with Notas in Col 19.


---

## Resumen (Summary) Sheet

**Range:** A1:R1991 (but only rows 0–36 have data)

This is a dashboard/summary sheet with multiple data blocks identified by "H" markers in column 0.

### Structure

```
Row 0:  [metadata] C0=3, C2=24454.11894
Row 1:  H | "Totales" | 89981035.17 | ... | "Fijos" | ... | "Ingresos" | ... | "Gastos" | ... | "Categorias de gasto"
```

### Data Blocks

**Block: Totales (Row 1)**
- Col 1: "Totales", Col 2: 89,981,035.17 (total net worth)

**Block: Account Breakdown (Rows 2–8)**
```
Inversiones = 33,062,248.15
Dolares = 481
Bancolombia = 307,778.45
Efectivo = 84,747
Otros = 548,000
Nubank = 54,208,380.67
```

**Block: Otros (Row 9)**
- Nequi = 0
- Tarjeta de Alimentacion = 548,000
- Dolares = 481

**Block: Efectivo (Row 14)**
- Efectivo = 84,747

**Block: Nubank (Row 17)**
- [Nu] Ahorros = 43,990,999.27
- [Nu] Viajes = 4,054,135.06
- [Nu] Fijos = 4,419,963.64
- [Nu] Para gastar = -0.21
- [Nu] Emergencias = 1,743,282.91

**Block: Bancolombia (Row 24)**
- [Bancolombia] Ahorros = 0
- [Bancolombia] Viajes = 0
- [Bancolombia] Fijos = 0
- [Bancolombia] Para gastar = 307,778.45

**Block: Inversiones (Row 30)**
- VOO = 2,441,026.03
- SHARES = 1.19334
- DELTA = 0.2332
- DIFF = 569,222.12
- TOTAL VOO = 3,010,248.15
- CDT = 30,052,000

**Parallel columns (same rows):**

| Col 4–6 | Col 10–11 | Col 13–14 | Col 16–17 |
|---------|-----------|-----------|-----------|
| Fijos (fixed expenses) | Ingresos (by account) | Gastos (by account) | Categorias de gasto |
| CELULAR=42,900 | Nequi=0 | Nequi=0 | Restaurante=1,094,950 |
| RAPPI=15,000 | Tarjeta Alim=3,941,290 | Tarjeta Alim=3,393,290 | Comida rapida=565,193 |
| SPOTIFY=10,700 | Dolares=700 | Dolares=516 | Regalos=29,800 |
| GYM=100,000 | Efectivo=2,804,647 | Efectivo=2,719,900 | Cine=349,400 |
| VERO=250,000 | [Nu] Ahorros=52,165,634 | [Nu] Ahorros=8,174,635 | Cremas=181,500 |
| GASOLINA=115,000 | [Nu] Viajes=10,118,618 | [Nu] Viajes=6,064,483 | Tatuajes=700,000 |
| PARQUEADERO=170,000 | [Nu] Para gastar=1,420,217 | [Nu] Para gastar=1,420,217 | Tecnologia=605,000 |
| SOAT=454,545 | [Nu] Emergencias=1,743,283 | [Nu] Emergencias=0 | Viajes=8,256,851 |
| SEGURO=2,181,818 | [Bancolombia] Para gastar=2,785,333 | [Bancolombia] Para gastar=2,477,555 | Emergencias=0 |
| IMPUESTO=700,000 | VOO=2,441,026 | VOO=0 | Otros=151,000 |
| GIMNASIA=320,000 | CDT=51,052,000 | CDT=21,000,000 | Ropa=173,000 |
| INTERNET=60,000 | | | Snacks=15,000 |

**Interpretation:**
- Col 4: Fixed expense name
- Col 5: Monthly budgeted amount
- Col 6: Actual annual amount (some differ from monthly × 12 due to periodicity)
- Col 10–11: Total income received per account (annual)
- Col 13–14: Total expenses per account (annual)
- Col 16–17: Total expenses by category (annual)

---

## PresupuestosV2 (Budget Planning) Sheet

**Range:** B1:R43

This sheet contains budget allocation and fixed expense planning.

### Section 1: Proyeccion (Savings Goals) — Col 0–5

```
Row 3: Header row
Row 4: Columns: "Hoy + Plazo" | "Valor" | "Plazo" | "Total"
Row 5: "Totales"
Row 7: "Ahorros" | date=2025-07-08 | 7,008,182 | #NUM! | #NUM!
Row 8: "Inversion" | date=2027-05-28 | 0 | 12 months | 0
Row 9: "Viajes" | date=2026-12-15 | 2,695,455 | 6 months | 16,172,727
Row 10: "Entretenimiento" | date=2027-05-28 | 1,078,182 | 12 months | 12,938,182
```

### Section 2: Totales (Category Totals) — Col 8–9

```
Row 3: "Totales"
Row 5: "Totales" = 318,182
Row 7: "Subscripciones" = 0
Row 8: "Carro" = 318,182
Row 9: "Salud" = 0
Row 10: "Otros" = 0
```

### Section 3: Gastos (Fixed Expense Details) — Col 11–16

```
Row 3: "Gastos"
Row 4: Headers: "Porc" | "Duracion" | "Total" | "Ciclo" | "Tipo"

Data:
CELULAR    | 42,900  | 1 month  | 0 | 27/mes      | Subscripciones
RAPPI      | 15,000  | 1 month  | 0 | 2/mes       | Subscripciones
SPOTIFY    | 10,700  | 1 month  | 0 | 3/mes       | Subscripciones
GYM        | 100,000 | 1 month  | 0 | (empty)     | Subscripciones
VERO       | 250,000 | 1 month  | 0 | (empty)     | Otros
GASOLINA   | 115,000 | 1 month  | 0 | (empty)     | Carro
PARQUEADERO| 170,000 | 1 month  | 0 | (empty)     | Carro
SOAT       | 500,000 | 11 months| 45,455 | 3/mar/yr | Carro
SEGURO     | 3,000,000| 11 months| 272,727 | 10/mayo/yr | Carro
IMPUESTO   | 700,000 | 11 months| 0 | 5/enero/yr  | Carro
GIMNASIA   | 320,000 | 3 months | 0 | (empty)     | Salud
INTERNET   | 60,000  | 1 month  | 0 | 11/mes      | Subscripciones
```

**Column meanings:**
- Porc (Col 12): Monthly cost of the expense
- Duracion (Col 13): How many months to save (1 = monthly, 11 = annual spread over 11 months)
- Total (Col 14): Monthly contribution needed (Porc / Duracion for annual expenses)
- Ciclo (Col 15): Payment schedule (e.g., "3/mar/yr" = due March 3rd yearly)
- Tipo (Col 16): Category grouping

### Section 4: Porcentajes (Budget Allocation) — Col 0–5

```
Row 13: "Porcentajes"
Row 14: Headers: "Porc" | "Total" | "Restante"
Row 15: "Totales"
Row 16: "Saldo inicial:" | 0% | 11,100,000 | 11,100,000
Row 17: "Gastos fijos" | 2.87% | 318,182 | 10,781,818
Row 18: (blank) | | "Bolsillos" | 7,326,364

Row 20: "Porcentaje total" | 100% | 10,781,818
Row 21: "Ahorros" | 65% | 7,008,182 | 3,773,636
Row 22: "Inversiones" | 0% | 0 | 3,773,636
Row 23: "Emergencia" | 0% | 0 | 3,773,636
Row 24: "Viajes" | 25% | 2,695,455 | 1,078,182
Row 25: "Entretenimiento" | 10% | 1,078,182 | ~0
```

**Interpretation:**
- Starting income: 11,100,000 COP
- Fixed expenses deducted first: 318,182 (2.87%)
- Remaining distributed by percentage: Ahorros 65%, Viajes 25%, Entretenimiento 10%


---

## Account/Pocket Mapping for Migration

Based on all Medio values and the Resumen sheet, here's the account structure:

### Accounts

| Account Name | Currency | Sub-accounts (Pockets) |
|-------------|----------|----------------------|
| Nubank | COP | Ahorros, Viajes, Fijos, Para gastar, Emergencias |
| Bancolombia | COP | Ahorros, Viajes, Fijos, Para gastar |
| Efectivo | COP | Ahorros, Para gastar |
| Nequi | COP | (single pocket) |
| Tarjeta de Alimentacion | COP | (single pocket) |
| Dolares | USD | (single pocket) |
| CDT | COP | (single pocket — term deposit) |
| VOO | USD | (investment — stock) |

### Medio → Account/Pocket Resolution

| Medio Value in Excel | Account | Pocket |
|---------------------|---------|--------|
| [Nu] Ahorros | Nubank | Ahorros |
| [Nu] Viajes | Nubank | Viajes |
| [Nu] Para gastar | Nubank | Para gastar |
| [Nu] Emergencias | Nubank | Emergencias |
| [Bancolombia] Ahorros | Bancolombia | Ahorros |
| [Bancolombia] Viajes | Bancolombia | Viajes |
| [Bancolombia] Fijos | Bancolombia | Fijos |
| [Bancolombia] Para gastar | Bancolombia | Para gastar |
| Ahorros | Nubank | Ahorros (implied) |
| Viajes | Nubank | Viajes (implied) |
| Para gastar | Nubank | Para gastar (implied) |
| Efectivo | Efectivo | Para gastar |
| Efectivo Para gastar | Efectivo | Para gastar |
| Efectivo Ahorros | Efectivo | Ahorros |
| Tarjeta de Alimentacion | Tarjeta de Alimentacion | (default) |
| Nequi | Nequi | (default) |
| CDT | CDT | (default) |
| Dolares | Dolares | (default) |
| VOO | VOO | (default) |
| Tarjeta Debito | Bancolombia | Para gastar (legacy name) |

**Note:** Short names like "Ahorros", "Viajes", "Para gastar" without a prefix likely refer to Nubank pockets (the primary bank).

---

## Extraction Guidance for Scripts

### Key Challenges

1. **December column shift:** All columns are +1 compared to other months. Detect by checking if section title "Gastos" is at Col 0 or Col 1.

2. **Empty Medio in early months:** January (and partially Feb–May) may have empty Medio columns. For Gastos without Medio, the account is unknown — may need to default or skip.

3. **Fixed expense name location:** In early months, the fixed expense name is in "Notas" (offset 2). In later months, it's in "Medio" (offset 3). Check both.

4. **Negative amounts in Gastos Fijos:** January uses negative numbers for costs. Later months use positive. Normalize to positive for expenses.

5. **Null dates:** Some rows have no date — they inherit from the previous row with a date, or are sub-items.

6. **Sub-items in Ingresos:** Rows without Fecha and Medio are breakdowns of the previous row (e.g., trip expenses split into hotel, tickets, etc.)

7. **Excel date serials:** Dates are stored as numbers (e.g., 45306 = 2024-01-15). Use `XLSX.SSF.parse_date_code()` to convert.

8. **Data ends detection:** Rows are not contiguous — there can be gaps. Use a threshold (e.g., 5+ consecutive empty rows) to detect section end rather than first empty row.

### Recommended Extraction Algorithm

```
For each month sheet:
  1. Find section title row (scan rows 0-3 for "Gastos" string)
  2. Determine base column offset (0 for most months, 1 for December)
  3. Header row = title row + 1
  4. Data starts at title row + 2
  
  For each section:
    - Calculate column positions using base offset + section offset
    - Read rows until 5+ consecutive empty rows
    - For each row with data:
      - Parse date (Excel serial → ISO date)
      - If no date, inherit from previous row
      - Parse amount (absolute value for expenses)
      - Parse description from Notas
      - Parse account from Medio (or Notas for fixed expenses in early months)
```

### Net Worth Snapshots

The "Resumen final" section in January–May contains end-of-month account balances. These can be used to create net worth snapshots:

- January: Total = 49,577,895 COP
- February: Total = 56,798,848 COP
- March: Total = 60,699,264 COP
- April: Total = 60,699,264 COP (same as March — likely not updated)
- May: Total = 66,586,733 COP

June–December don't have this data in the monthly sheets, but the Resumen sheet has the final (December) totals: 89,981,035 COP.


---

## Additional Notes on Ingresos Fijos

The "Ingresos Fijos" section serves dual purposes:

1. **Monthly Reset/Contributions** — At the start of each month (e.g., 2024-03-01), entries with Notas="Reset" represent the monthly budget allocation being deposited into each fixed expense sub-pocket. These amounts match the budgeted monthly contributions from PresupuestosV2.

2. **Salary/Fixed Income** — Some entries have Notas="SALARIO" representing actual salary deposits.

**March example (15 rows):**
```
2024-03-01: 71,679 "Reset"     (likely CELULAR + buffer)
2024-03-01: 30,500 "Reset"     (likely RAPPI + buffer)
2024-03-01: 8,800 "Reset"      (SPOTIFY exact)
2024-03-01: 10,000 "Reset"     (likely GYM partial)
2024-03-01: 60,300 "Reset"     (likely UBER)
2024-03-01: 0 "Reset"          (skipped expense)
2024-03-01: 117,000 "Reset"    (likely GASOLINA)
2024-03-01: 71,000 "Reset"     (likely BARBERIA)
2024-03-01: 165,800 "Reset"    (likely PARQUEADERO)
2024-03-01: 73,600 "Reset"     (likely CREMAS)
2024-03-01: 80,050 "Reset"     (likely LAVADO CARRO)
2024-03-01: 190,000 "Reset"    (likely VERO)
2024-03-01: 488,000 "Reset"    (likely SOAT monthly)
2024-03-01: 3,362,000 "Reset"  (likely SEGURO monthly)
2024-03-01: 116,667 "Reset"    (likely IMPUESTO monthly)
2024-03-22: 40,000 "SALARIO"
```

**For extraction:** These "Reset" entries represent internal transfers (budget allocation), not external income. They should likely be treated as internal movements between pockets, not as income transactions.
