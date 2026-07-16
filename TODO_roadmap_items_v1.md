# Roadmap implementation tracker (v1)

## Verified Seller Tiers (Part 1)
- [ ] Extend `src/services/verification/verificationService.ts` with phone OTP + confirm + id verification request submit.
- [ ] Add tier-aware `VerificationBadge` (keep backward compatibility so old UI/data isn’t lost).
- [ ] Update marketplace seller UI usage (`ProductCard`, `ProductDetailPage`) to display tier when available, else fall back to existing `is_verified`.

## Price Suggestion Engine (Part 1)
- [ ] Add `src/services/pricing/priceEngine.ts`.
- [ ] Integrate into `ProductComposer` (category selection if missing; otherwise wire to existing fields).

## Smarter Reporting Engine (Part 1)
- [ ] Add `src/utils/perceptualHash.ts`.
- [ ] Update `ProductComposer` upload flow to compute pHash + client-side duplicate detection + risk scoring.
- [ ] Update `src/services/products/productService.ts` to accept/store `risk_score` + `auto_hidden` without breaking existing product creation calls.

## Verification + Risk Safety
- [ ] Ensure all changes are additive and include fallbacks so existing listings/users still render correctly.

