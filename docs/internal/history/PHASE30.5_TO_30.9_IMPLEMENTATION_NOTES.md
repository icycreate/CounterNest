# Implementation Notes

CounterNest POS v1.6.0 adds an administrator-only **Recipes & Ingredients** workspace with four tabs: Ingredients, Recipes, Restocking and Pricing.

## Install or upgrade

1. Preserve the current `.env` securely and create a verified CounterNest backup.
2. Apply Supabase migrations `202608240100` through `202608240400` in order.
3. Copy the preserved `.env` into this project folder.
4. Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\SETUP_COUNTERNEST_BROWSER_HOST.ps1"`.
5. Test ingredient receiving, recipe save, scheduled production completion, shortage rejection, restocking calculations and the optional price action.

## Operational order

1. Add suppliers in **Stock Receiving** if preferred suppliers will be assigned.
2. Add ingredients and define base unit, reorder level, target level and cost.
3. Receive opening ingredient quantities or use a documented manual adjustment.
4. Create one recipe per finished product and enter the expected batch yield.
5. Schedule and complete production. Active recipes consume ingredients automatically.
6. Review **Restocking** before ordering and **Pricing** when costs change.

## Pricing policy

The recommendation is guidance only. `recommended price = calculated unit cost ÷ (1 − target gross margin)`. An administrator may keep the current selling price. Applying a recommendation requires explicit confirmation and creates an append-only price-change record.

## LAN mode

Run `ENABLE_COUNTERNEST_LAN.ps1` once as administrator, then use the **CounterNest POS - Local Network** shortcut. Keep the host computer running. Do not expose port 4173 to the public internet. For cameras or installable mobile PWA behavior on other devices, use a future HTTPS deployment.
