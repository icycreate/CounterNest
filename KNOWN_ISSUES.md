# Known issues and acceptance limits — RC9

- Live Supabase/Vercel staging and physical installed Android/iOS PWA acceptance are pending. Local PostgreSQL uses mocked Supabase auth/storage; browser screenshots use fictional source-record fixtures. No live production changes or deployment were performed.
- Conflict guidance covers loaded records (200 per page, Load more available). Today shows up to 20; unscheduled shows 25 and total. Use Day and additional pages for complete review. Custom ranges are limited to 60 days; server buffers to at most 62.
- Date-only records have no assumed time/duration. Delivery expected time is unavailable in the existing PO model. Overdue-delivery notification lookback is 30 days. Purchasing approval requests do not become dated PO events until an eligible actual PO exists.
- Ingredient shortage/later-delivery warnings are planning snapshots. They do not reserve stock or allocate a particular purchase order. Untimed work does not contribute to timed-overlap detection.
- Rescheduling uses a reviewable form; drag-and-drop is not implemented. Swipe on blank calendar space is implemented; physical touch/OS gesture acceptance remains pending.
- Existing Vite large-bundle warning and test-only CommonJS import.meta warnings remain nonfatal. No new runtime dependencies were added.
- Calendar is online operational data, not an offline event store. Verify reconnect/session expiry and service-worker updates on the target deployment. OS-controlled PWA splash colors may remain cached; native splash animation is not possible.
- Browser preview dimensions are measured CSS dimensions and differ from the viewport request because of host-panel scaling. Evidence records actual measurements; captures do not claim a particular physical device.
- Source-module create permissions remain as before: administrator order/production creation, existing purchasing approvals/permissions. Calendar does not expand those rights.
