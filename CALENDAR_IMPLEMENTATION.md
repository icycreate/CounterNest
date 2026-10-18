# Operations Calendar implementation — RC9

## Original sources

The calendar is a read projection, not a separate scheduling database. SQL combines orders (accepted pre-orders and cakes), production_batches, ingredient_purchase_orders, and legacy purchase_orders within the signed-in business. Canceled records are omitted; completed dated records remain useful history. Public/anonymous callers, temporary/frozen/deletion-pending accounts and unauthorized roles cannot read or edit it.

Migration 90 adds only production_batches.scheduled_start_at and expected_end_at, using existing scheduled_date, ux_assignee, stage/status, order pickup/deadline and PO expected_date. A database constraint requires finish after start. Date indexes cover each source, including coalesced cake pickup/deadline and production interval endpoints. No historical data is deleted or fabricated.

get_operations_calendar validates a maximum 62-day buffered request, performs authorized source/date/type/status/staff/search filtering before pagination, and returns up to 200 rows plus total/has_more. The UI accepts at most 60 days, requests a one-day buffer, and separately requests Today (20) and bounded unscheduled data (25 plus total). Overnight batches are included on intersecting days. Search length, source kinds and offsets are bounded. Queries are range-bound; no historical event cache persists to storage. Only filters are retained in memory under a user/business key. Hidden-tab polling stops; requests have cancellation and a 15-second timeout.

get_calendar_record returns sanitized original-source detail and its schedule snapshot. reschedule_operations_calendar locks and updates the original row, rejects stale snapshots, validates same-shop active staff, permissions, terminal statuses and business-zone dates, and rejects nonexistent local times. Audit triggers on all four original sources write schedule_changed to commercial_events, with old/new schedule, reason, actor and timestamp. Calendar never posts stock movements or duplicates source rows.

Role checks are enforced inside SQL SECURITY DEFINER functions with fixed search paths and own-shop predicates. Internal helpers are revoked from API roles. Calendar DTOs omit prices, financial costs and staff email addresses. Manager create actions remain constrained by the original administrator-only order/production modules. Source-panel links are permission-aware.

get_calendar_notifications derives stable source/id/date/kind IDs for production within one hour, pickups/cakes today and overdue deliveries (30-day lookback); completed production does not alert. ux_workspace merges these into its existing Notification Center and deduplicates IDs; existing read IDs work. No notification table or persistent calendar records are inserted. A due-date change intentionally creates a new alert identity.

Known timed overlaps compare loaded, unfinished batches assigned to the same person (or both unassigned). Pickup/finish checks require a real linked batch and permission. Ingredient flags use current reservation snapshots. Later-delivery guidance matches ingredients in related open purchasing; it is advisory, not a promise that a specific PO is allocated to a batch. These checks do not replace stock or production controls.

src/OperationsCalendar.tsx contains all four views, source details, original-record schedule editor, filters and module links. calendarModel.ts contains date/zone/conflict logic. calendar.css uses the shared theme. Existing RC8 Back boundary handles modal closure and unsaved forms; same-page record query changes now re-render the router. Original Preparation's standalone branch also hosts the selected-source panel. Date/time submission reads the form's actual named values so native date controls save their visible value.

Automated PostgreSQL/React/model and browser evidence are described in BUILD_VALIDATION_REPORT.md. Browser captures use a separate fictional QA adapter outside the release source, while database contracts and row mutations execute against migrated PostgreSQL. Neither substitutes for a deployed Supabase RLS/configuration or physical-device test.
