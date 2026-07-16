# TODO

## Critical bug fixes (done)
- [x] ShopJoinPage race condition: gate invite verification on `useAuthStore().loading`.
- [x] productService.getProductById: return `data` directly (remove `|| []`).
- [x] useToggleProductStock: replace `alert()` with `toast.error()`.

## Critical bug fixes (requires manual Supabase SQL / check)
- [ ] Price drop listener never fires: replace client realtime diff with Postgres trigger-based notification.
  - [ ] Confirm notifications table + saved_items schema/columns match trigger SQL.
  - [ ] Apply SQL to create function + trigger in Supabase.
  - [ ] Delete/stop old client realtime listener (`src/hooks/usePriceDrop.ts`) and its usage.

## Quick wins (pending)
- [ ] ShopList debounce (only if this is part of current failing set; skipped for now per request to avoid build).
- [ ] shopReviewService duplicate reviews: add unique constraint + handle 23505.
- [ ] ProductCard share: ensure toast is wired.

