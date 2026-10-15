# Phase 34.5 — Ingredient Conversion & Yield Engine

Purpose: represent ingredients produced from other stocked ingredients without double-deducting inventory.

## Workflow
1. Administrator creates both source and reusable derived ingredients.
2. Administrator defines a conversion rule: source quantity → one or more outputs.
3. Cost shares can be allocated across reusable outputs; non-inventory waste/by-products can be recorded.
4. Running the conversion deducts the source once, adds reusable output quantities, and appends immutable movement/event evidence.
5. Countable source units (`each`) must be converted in whole numbers.

Example: 1 Whole Egg → 18 g Egg Yolk + 32 g Egg White. A recipe needing 90 g yolk can calculate five eggs when no yolk stock is available.
