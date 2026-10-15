# Phase 36.8 — Production Demand Forecast

Forecast / Shortages uses 7–180 lookback days, optional matching-weekday averages and a 0–100% buffer. Zero-sales eligible days are included. Fully refunded/voided sales are excluded; returned units are subtracted. No AI model or external forecasting service is used.

Suggested base-recipe units = max(ceil(recent daily average × (1 + buffer/100) + open pickup demand − stock − scheduled production), 0). The table shows every input and the eligible-day count. Variant recipe scales convert history, independent stock and pickup demand into base-recipe units.

Management chooses a product/variant and approves the sellable quantity/date. Planning reuses the existing recipe preview and shortage checks; planning never consumes inventory. Ingredients are consumed only on production completion. It is a guidance model, not a promise: review weather/events, holidays, expiry and one-off orders. The first model uses recorded stock balances; shortage screens provide the stricter usable-lot view.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.
