# Phase 35.2 — Customer Display & Order Queue Improvements

The Phase 34.3 customer request becomes a lightweight fulfillment workflow: Received → Preparing → Ready → Completed (or Cancelled). The customer screen polls the protected status token, while the selected Main/Sub POS manages the fulfillment state.

This remains a selection/request system. Customers cannot take payment, reserve stock, apply discounts, or create a final sale.
