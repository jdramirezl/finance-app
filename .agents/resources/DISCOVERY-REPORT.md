# Phase 1: Excel Discovery Report

## File Inventory & Date Ranges

| # | File | Period | Currency | Location |
|---|------|--------|----------|----------|
| 1 | `Presupuesto mensual.xlsx` | Jan 2023 – May 2024 | COP | Colombia |
| 2 | `Shin Presupuesto Mensual 2024.xlsx` | Jan 2024 – Dec 2024 | COP | Colombia |
| 3 | `Presupuesto Mensual 2025.xlsx` | Jan 2025 – Aug 2025 | COP | Colombia |
| 4 | `Presupuesto Mensual 2025 MEXICO.xlsx` | Oct 2025 – Nov 2025 | MXN + COP + USD | Mexico |

**Overlap**: File 1 ends ~May 2024, File 2 starts Jan 2024. File 2 is the "clean restart" for 2024 (named "Shin" = new). File 3 continues into 2025 Colombia. File 4 starts when you moved to Mexico (Oct 2025).

---

## Structure Analysis

### File 1: `Presupuesto mensual.xlsx` (Jan 2023 – May 2024)

**24 sheets total.** Structure evolved significantly over time.

#### Monthly Tabs (oldest → newest):

**Early format (123, 223, 323)** — 2 sections side by side:
- Left: Expenses (Fecha | Importe | Descripción | Categoría)
- Right: Income (Fecha | Importe | Descripción | Categoría)
- Top rows: `Saldo inicial` and `Saldo final` (opening/closing balance)

**Mid format (423, 523-1, 523-2, 623-1, 623-2)** — Added "Medio" (payment method/account):
- Left: Gastos (Fecha | Costo | Notas | Categoria | Medio)
- Right: Ingresos/Ganancias (Fecha | Costo | Notas | Medio)

**Late format (823, 9-1023, 1223, 12723)** — Same as mid but with leading empty column:
- Left: Gastos (Fecha | Costo | Notas | Categoria | Medio)
- Right: Ingresos (Fecha | Costo | Notas | Medio)

**Transition format (124, 224, 424, 524)** — Summary-style sheets (like ResumenV2):
- These are NOT monthly transaction sheets — they're summary/snapshot pages
- Show: Totales, Inversiones, Dolares, Bancolombia, Efectivo, Otros, Fijos, Ingresos, Gastos, Categorias

#### Special Tabs:
- **ResumenV2**: Current month summary (same structure as 524)
- **TransaccionesV2**: Transactions for the current period (May-Jun 2024), same format as late monthly tabs
- **FijosV2**: Fixed expenses tracking
- **PresupuestosV2**: Budget allocations
- **CDT**: Certificate of Deposit tracking

#### Accounts (from "Medio" column):
- Para gastar, Ahorros, Viajes, Nequi, Tarjeta de Ahorro, Efectivo, Tarjeta Credito, CDT, Pago Tarjeta, Efectivo par(a gastar)

---

### File 2: `Shin Presupuesto Mensual 2024.xlsx` (Jan – Dec 2024)

**14 sheets.** Clean, consistent structure across all months.

#### Monthly Tab Structure (4 sections side by side):
1. **Gastos** (Expenses): Fecha | Costo | Notas | Categoria | Medio
2. **Ingresos** (Income): Fecha | Ingreso | Notas | Medio
3. **Gastos Fijos** (Fixed Expenses): Fecha | Costo | Notas | Medio (mapped to fixed expense names)
4. **Ingresos Fijos** (Fixed Income): Fecha | Costo | Notas | Medio (mapped to fixed expense names)

Plus a 5th mini-section: **Resumen financiero** (financial summary per account)

#### Special Tabs:
- **Resumen**: Master summary (Totales, Inversiones, Dolares, Bancolombia, Efectivo, Nubank, Fijos, Ingresos/Gastos per account, Categorias)
- **PresupuestosV2**: Budget allocations

#### Accounts (from "Medio" column):
- Para gastar, Ahorros, Viajes, Nequi, Tarjeta de Ahorro, Efectivo, CDT, VOO, Dolares
- Later months add: [Nu] Ahorros, [Nu] Viajes, [Nu] Para gastar, [Nu] Emergencias, [Bancolombia] variants

#### Categories (from "Categoria" column):
- Comida, Transporte, Cine, Viajes, Regalos, Tecnologia, Cremas, Tatuajes, Suscripcion, Juegos, Restaurante, Comida rapida, Ropa, Snacks, Otros

---

### File 3: `Presupuesto Mensual 2025.xlsx` (Jan – Aug 2025)

**16 sheets.** Same structure as File 2 but with more accounts.

#### Monthly Tab Structure (identical to File 2):
1. **Gastos**: Fecha | Costo | Notas | Medio
2. **Ingresos**: Fecha | Ingreso | Notas | Medio
3. **Gastos Fijos**: Fecha | Costo | Notas | Fixed-expense-name
4. **Ingresos Fijos**: Fecha | Costo | Notas | Fixed-expense-name

Note: "Categoria" column appears to be MISSING in File 3 monthly tabs (only 4 cols per section, not 5). The "Medio" serves as both account AND implicit category.

#### Special Tabs:
- **Resumen**: Master summary
- **PresupuestosV2**: Budget allocations
- **Party**: Special event tracking
- **Orlando_Agosto**: Trip expense tracking

#### Accounts:
- [Nu] Ahorros, [Nu] Viajes, [Nu] Para gastar, [Nu] Emergencias, [Nu] Regalos
- [Bancolombia] variants, Tarjeta de Ahorro, Efectivo, CDT, VOO

#### Fixed Expenses:
- CELULAR, RAPPI, SPOTIFY, GYM, VERO, GASOLINA, PARQUEADERO, SOAT, SEGURO, IMPUESTO, GIMNASIA, INTERNET, BARBERIA, CREMAS

---

### File 4: `Presupuesto Mensual 2025 MEXICO.xlsx` (Oct – Nov 2025)

**14 sheets.** Multi-currency (MXN primary, COP + USD secondary).

#### Monthly Tab Structure (same 4 sections as File 2/3):
1. **Gastos**: Fecha | Costo | Notas | Medio
2. **Ingresos**: Fecha | Ingreso | Notas | Medio
3. **Gastos Fijos**: Fecha | Costo | Notas | Fixed-expense-name
4. **Ingresos Fijos**: Fecha | Costo | Notas | Fixed-expense-name

#### Key Difference: Multi-currency accounts
- MXN accounts: [NuMX] Viajes, [NuMX] Para gastar, [NuMX] Emergencias, [NuMX] Regalos, [NuMX] Ahorros, [BX] (Banco Mexico) variants
- COP accounts: [Nu] Ahorros, [Bancolombia] variants
- USD accounts: [USD] Efectivo

#### Resumen shows 3 currency totals:
- Total COP: 58,145,100
- Total MXN: 6,818.3
- Total USD: 90,437,533.96 (likely COP equivalent)

#### Fixed Expenses (MXN):
- RENTA, CELULAR, INTERNET, LUZ, AGUA, GAS, TRANSPORTE, PELUQUERIA, MERCADO, LAVANDERIA, CREMAS, VERO, RAPPI

#### Only 2 months have data (Oct, Nov 2025). Dec onward are empty (that's when the app took over).

---

## Summary of Structural Variants

| Variant | Files/Tabs | Columns (Expenses) | Columns (Income) |
|---------|-----------|-------------------|-----------------|
| **V1 (early)** | File 1: 123, 223, 323 | Fecha, Importe, Descripción, Categoría | Fecha, Importe, Descripción, Categoría |
| **V2 (mid)** | File 1: 423–623 | Fecha, Costo, Notas, Categoria, Medio | Fecha, Costo, Notas, Medio |
| **V3 (late)** | File 1: 823–1223, TransaccionesV2 | (blank), Fecha, Costo, Notas, Categoria, Medio | (blank), Fecha, Costo, Notas, Medio |
| **V4 (2024)** | File 2: all months | Fecha, Costo, Notas, Categoria, Medio | Fecha, Ingreso, Notas, Medio |
| **V5 (2025 COP)** | File 3: all months | Fecha, Costo, Notas, Medio | Fecha, Ingreso, Notas, Medio |
| **V6 (2025 MXN)** | File 4: Oct, Nov | Fecha, Costo, Notas, Medio | Fecha, Ingreso, Notas, Medio |

Key differences:
- V1-V3: No "Medio" in earliest, then added. Category sometimes present.
- V4: Has both Categoria AND Medio (most complete)
- V5-V6: Dropped Categoria column, only Medio (account) remains

---

## Resumen (Summary) Sheets — Net Worth Snapshots

Each file has a Resumen sheet showing account balances. These are the **net worth snapshots**.

File 1 also has per-month summary tabs (124, 224, 424, 524) that show the state at end of each month — these are effectively monthly snapshots.

### Extractable Snapshot Data:

| Source | Accounts Listed | Currency |
|--------|----------------|----------|
| File 1 ResumenV2 | Inversiones, Dolares, Bancolombia, Efectivo, Otros (Nequi, Tarjeta de A, Dolares), CDT, VOO | COP |
| File 1 monthly summaries (124, 224, 424, 524) | Same as above | COP |
| File 2 Resumen | Inversiones, Dolares, Bancolombia, Efectivo, Nubank, Otros | COP |
| File 3 Resumen | Same as File 2 + more Nubank sub-accounts | COP |
| File 4 Resumen | COP total, MXN total, USD total (multi-currency) | COP + MXN + USD |

---

## "Reset" Entries

Important finding: The Excel files use "Reset" entries at the start of each new period to set opening balances. For example in File 1's TransaccionesV2:
```
DATE:2024-05 | 10322995 | Reset | Ahorros
DATE:2024-05 | 1191306  | Reset | VOO
DATE:2024-05 | 9814917  | Reset | Viajes
DATE:2024-05 | 42000000 | Reset | CDT
```

These are NOT real income — they're balance carry-forwards. We must EXCLUDE these from movement imports.

Similarly, File 3 January has "cambio de plan" entries that are balance resets when switching from File 2's structure.
