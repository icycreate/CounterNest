# Role and permission review
| Surface | Administrator | Employee | Customer / anonymous |
| --- | --- | --- | --- |
| POS, products, customers, scheduled orders, kitchen | Own shop | Own shop operations | No staff access |
| Catalogue administration / variants / pricing | Own shop | Denied page and privileged mutations | Token-protected read-only presentation |
| Inventory/recipes/receiving/planning/profit/cash/staff/audit/backup/readiness | Management pages | Denied restricted pages | Denied |
| Production Studio | All tools | Recipe guidance and training tabs | Denied |
| Team workspace | Own shop | Permitted tasks/checklists/handover/schedule | Denied |
| Initial-password account | Own setup flag and initial change | Own setup flag and initial change | No normal shop/role |
| Create/reset staff | Verified active admin, same shop | Denied | Denied |
| Self password change | Current password + confirmation | Current password + confirmation | Denied |

The shared page map hides restricted links and prevents restricted components mounting. Sensitive database mutations and Edge handlers independently check staff, role and shop. RLS restricts rows by effective shop. Anonymous customer catalogue access uses a rotating enabled token and projects customer-facing fields.

Legacy same-shop staff SELECT access to operational tables (including product costs) remains for compatibility. These UI restrictions do not claim column-level data secrecy. Manager PIN checks are server-side; local regression PIN crypt is mocked and real hashing requires cloud acceptance.

The RC1 checkout recovery ledger allows own staff/shop-admin reads, revokes direct authenticated writes, and mutates through a staff-validated RPC. Replays check original staff and unchanged intent payload. Stock counts lock/check the product row before delegating to the audited adjustment RPC.

All four Edge handlers validate bearer identity with Auth, active profile and role/shop as applicable. Their gateway config uses verify_jwt=false because handlers perform that verification themselves. Do not replace handlers with anonymous logic. Bodies reject malformed/non-string fields. Audit writes omit passwords; reset fails closed by restricting the profile before updating Auth.

Review test evidence in DATABASE_TEST_RESULTS.json and EDGE_TEST_RESULTS.json. This is a source/local review; real Auth claims, gateway/CORS, Storage, two-shop devices and concurrent sessions remain acceptance work.

## Request and register update
Anonymous customers can submit through an enabled display token only; they cannot read request tables/inbox or customer history. Request/event rows have RLS and RPC-only writes. Same-shop active staff can review/status/prepare the preferred contact action. Only admin can configure methods/origin, authorize alternate contact with reason/destination, or create the linked scheduled order. The original preference is retained after override. Audit Log now includes request/contact events and station-stamped register opening.

Register opening is admin-only in both new and legacy RPC entry points. Old submit_staff_opening_cash execute permission is revoked, including for admins, because historical declarations are no longer an active workflow. No cash login gate remains. Tests use broader table grants to confirm RLS still blocks anonymous/foreign reads and direct mutations.
