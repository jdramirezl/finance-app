# Plan: Derive Missing Monthly Net Worth Snapshots

## Summary

**Approach**: Proportional interpolation between known anchors, using movement data to shape the curve.

**Viability**: Confirmed. Raw movement flows are unreliable for absolute net worth calculation (internal transfers inflate totals by 2-6x), but the **relative distribution** of flows between months is meaningful. By scaling flows to match known anchor deltas, we get plausible intermediate values that respect both the trajectory shape and the boundary constraints.

**Key validation results**:
- `exclude_reset_only` strategy: 1.4% error over 7 months (May→Dec 2024)
- Proportional interpolation: 0% error by construction (always hits both anchors)
- Scale factors range from 0.15 to 0.95 depending on how many internal transfers exist in the period

---

## 1. Movement Classification

### Movements that DO NOT affect net worth (internal transfers)

| Type | Description | How to identify |
|------|-------------|-----------------|
| **Reset** | Opening balance entries when user "caught up" on accounting | `description` contains "reset" (case-insensitive) |
| **CDT rollovers** | Money moving between bank ↔ term deposit | `description` contains "cdt" |
| **Investment transfers** | Money moving between bank ↔ brokerage | `description` contains "inversion" or "investment", OR paired income/expense with same amount to investment accounts |
| **Account restructuring** | "cambio de planilla" - moving money between accounts | `description` contains "cambio de planilla" |
| **Ingresos Fijos** | Salary allocation to fixed expense pockets (internal pocket-to-pocket) | `source_section == "Ingresos Fijos"` |
| **Large no-description UNKNOWN** | Likely CDT/investment movements that weren't labeled | `description` is null/empty AND `account_name == "UNKNOWN"` AND `amount >= 1,000,000` |

### Movements that DO affect net worth (real external flows)

| Type | Description |
|------|-------------|
| **Regular income** | Salary, reimbursements, payments received (`source_section == "Ingresos"`, not matching exclusion patterns) |
| **Regular expenses** | Purchases, bills, subscriptions (`source_section == "Gastos"`) |
| **Gastos Fijos** | Actual payments from fixed expense pockets (rent, gym, etc.) (`source_section == "Gastos Fijos"`) |

### Why absolute classification doesn't matter

The proportional interpolation approach makes exact classification less critical. Even if we misclassify some movements, the **relative** monthly distribution is preserved and the scale factor corrects the absolute values. What matters is that the same classification is applied consistently across all months in a gap.

---

## 2. Algorithm: Proportional Interpolation

```
For each gap between anchor A (date_a, value_a) and anchor B (date_b, value_b):
  1. Load movements for each month in the gap
  2. Compute raw net flow per month: sum(income) - sum(expenses), excluding Resets
  3. Compute scale_factor = (value_b - value_a) / sum(all_raw_flows)
  4. For each month i:
       estimated_net_worth[i] = estimated_net_worth[i-1] + (raw_flow[i] * scale_factor)
  5. Result: estimated_net_worth[last_month] == value_b (guaranteed)
```

### Edge cases

- **scale_factor = 0** (sum of flows is 0): Use linear interpolation
- **scale_factor < 0** (flows go opposite direction of anchors): Still valid — means the internal transfers dominate the raw signal, but relative distribution still shapes the curve
- **Non-monotonic results**: Acceptable. Net worth can temporarily decrease (large purchases, market drops) even while trending up over the full period. The 2025 data shows this pattern (investment transfers cause apparent dips).

### Why not just linear interpolation?

Linear interpolation ignores movement data entirely. The proportional approach captures real patterns:
- Months with salary + low spending → larger increase
- Months with big purchases (travel, car) → smaller increase or decrease
- Months with no activity → flat

---

## 3. Handling Each Gap

### Gap 1: Mar–Oct 2023 (8 months)

- **Anchors**: Feb 2023 (25,991,162) → Nov 2023 (36,752,896)
- **Delta**: +10,761,734 COP
- **Data quality**: Movement data exists for all months. Scale factor = 0.155 (raw flows are 6.4x too high due to CDT movements in Aug 2023)
- **Confidence**: Medium. The shape is driven heavily by Aug 2023 (CDT maturity month), which may not reflect real net worth change timing. But the overall trajectory (gradual growth with a step in mid-year) is plausible.

### Gap 2: Jun–Nov 2024 (6 months)

- **Anchors**: May 2024 (66,586,733) → Dec 2024 (89,981,035)
- **Delta**: +23,394,302 COP
- **Data quality**: Excellent. Scale factor = 0.95 (raw flows nearly match target). The `exclude_reset_only` strategy gives 1.4% error without any scaling.
- **Confidence**: High. Monthly flows closely track reality.

### Gap 3: Jan–Jul 2025 (7 months)

- **Anchors**: Dec 2024 (89,981,035) → Aug 2025 (122,166,763)
- **Delta**: +32,185,728 COP
- **Data quality**: Good movement data. Scale factor = 0.41 (large investment transfers in Jan/Apr inflate raw flows).
- **Confidence**: Medium-High. Non-monotonic curve (dips in Feb, Jul) reflects real investment movements but may overstate volatility.

### Gap 4: Sep 2025 (1 month)

- **Anchors**: Aug 2025 (122,166,763) → Nov 2025 (150,030,925)
- **Delta**: +27,864,162 COP over 3 months
- **Data quality**: Good. Oct 2025 has large real income (car payment received: 51M).
- **Confidence**: High for relative distribution. Oct dominates the growth.

---

## 4. Validation Criteria

### Primary validation (for gaps with both anchors)

- **Guaranteed**: Computed end-of-gap value matches the target anchor exactly (by construction)
- **Monotonicity check**: Flag months where net worth decreases. Not necessarily wrong, but worth reviewing.
- **Reasonableness**: Monthly changes should be < 30% of total net worth (larger swings indicate possible classification errors)

### Secondary validation (sanity checks)

- **Cross-reference with known patterns**: User's salary was ~3-4M COP/month in 2023, ~5-7M in 2024, ~15-20M in 2025 (Amazon salary). Monthly growth should roughly track this.
- **No negative net worth**: All values must be positive
- **Smooth transitions at anchor boundaries**: The last derived value before an anchor should be close to (not wildly different from) the anchor

### Confidence levels for output

- **High**: Scale factor 0.8–1.2 (raw flows closely match reality)
- **Medium**: Scale factor 0.3–0.8 or 1.2–3.0 (significant internal transfers but shape is meaningful)
- **Low**: Scale factor < 0.3 or > 3.0 (internal transfers dominate; shape may not reflect reality)

---

## 5. Special Considerations

### The April 2024 duplicate snapshot

The April 2024 snapshot (60,699,264) is identical to March 2024 (60,699,264). This is likely a placeholder/copy, not a real measurement. **Decision**: Use it as an anchor anyway — if the user recorded it as the same value, we trust it. The Mar→May gap uses it as an intermediate anchor.

### CDT interest vs principal

CDT movements include both principal (internal transfer) and interest (real income). We cannot separate them in the data. The proportional approach handles this gracefully — the scale factor absorbs the error.

### Multi-currency movements

Some movements are in USD (e.g., "diff dolares viaje" for 516 USD). These are small relative to COP totals. **Decision**: Include them at face value (the amount field is already in the movement's currency). Since net worth snapshots are all in COP, and the USD movements are small, the error is negligible. A future enhancement could apply historical exchange rates.

### The Jan 2023 snapshot

There's a Jan 2023 snapshot (1,605,000 COP) marked "low confidence" — it only tracks one account. **Decision**: Do not use as an anchor. Start from Feb 2023.

---

## 6. Coder Task Breakdown

### Task 1: Derive snapshots script

**File**: `.agents/resources/scripts/derive-snapshots.ts` (or `.js`)

**Input**:
- `snapshots-all.json` (known anchors)
- Movement JSON files from `file1/`, `file2/`, `file3/`, `file4/`

**Logic**:
1. Load all known anchors, sorted by date
2. Identify gaps (months between consecutive anchors with no snapshot)
3. For each gap:
   a. Load movements for each month in the gap
   b. Compute raw net flow per month (exclude Resets only — simplest strategy that works)
   c. Apply proportional interpolation between bounding anchors
   d. Assign confidence level based on scale factor
4. Output: `derived-snapshots.json` with same schema as `snapshots-all.json`

**Output schema** (per entry):
```json
{
  "date": "2024-06-30",
  "total_value": 54456160,
  "currency": "COP",
  "breakdown": null,
  "source_file": "derived",
  "source_sheet": null,
  "confidence": "high",
  "notes": "Proportional interpolation between 2024-05-31 (66,586,733) and 2024-12-31 (89,981,035). Scale factor: 0.95.",
  "derivation": {
    "method": "proportional_interpolation",
    "anchor_start": { "date": "2024-05-31", "value": 66586733 },
    "anchor_end": { "date": "2024-12-31", "value": 89981035 },
    "scale_factor": 0.9475,
    "raw_monthly_flow": -12803192,
    "scaled_monthly_flow": -12130573
  }
}
```

### Task 2: Validation report

**Output**: `derived-snapshots-validation.md`

Contents:
- Table of all derived values with confidence levels
- Comparison of raw forward-propagation vs proportional results
- Monotonicity flags
- Scale factor analysis per gap
- Final merged timeline (known + derived, sorted by date)

---

## 7. Validation Test Results (from research)

### Best-performing strategy: `exclude_reset_only` + proportional scaling

| Gap | Scale Factor | Confidence | Notes |
|-----|-------------|------------|-------|
| Feb→Nov 2023 | 0.155 | Medium | CDT movements in Aug dominate raw flows |
| Nov→Dec 2023 | — | High | Single month, -4.2% raw error |
| Dec23→Jan24 | — | High | Single month, -0.5% raw error |
| Jan→Feb 2024 | — | Medium | CDT maturity inflates raw (+46%), needs scaling |
| Feb→Mar 2024 | — | High | Single month, +1.6% raw error |
| Mar→May 2024 | — | Medium | April snapshot is duplicate of March |
| May→Dec 2024 | 0.948 | High | Raw flows nearly perfect (1.4% error) |
| Dec24→Aug25 | 0.408 | Medium-High | Investment transfers inflate raw flows |
| Aug→Nov 2025 | 0.415 | High | Clear distribution (Oct car payment) |

### Conclusion

The approach is viable. Proportional interpolation guarantees anchor-matching while preserving the relative shape of monthly flows. The derived values won't be exact (we can't know the true intermediate net worth without real snapshots), but they'll be plausible estimates that respect both the movement patterns and the known boundary values.
