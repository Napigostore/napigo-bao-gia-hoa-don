# CI status for app A (Báo giá & Hóa đơn)

Copied from `C:\AI\Seller tool\ShiftCalendar` and changed to the app A bundle ID `com.napigo.baogiahoadon`.

## Copied (done)

- `.github/workflows/ios.yml`: the same TestFlight / listing / submit pipeline.
- `tools/asc_check.py`, `asc_version.py`, `asc_listing.py`, `asc_submit.py`: App Store Connect scripts.
- Syntax check passed for the scripts and the YAML parses.

## Not copied on purpose

- `tools/asc_pro.py`: creates Shift Calendar subscriptions. App A has no subscription decision yet.
- `store/ios/` (Shift Calendar screenshots and texts): will be built for app A from `reports/04_store_listing.md`.

## Must be done before any `[testflight]` push

1. **Create the app record** in App Store Connect with bundle ID `com.napigo.baogiahoadon` (CEO).
2. **Create the GitHub repo** and add the 4 secrets: `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (CEO).
3. **Demo mode for screenshots:** `ios.yml` launches the app with `-demo` flags. The app has no `src/demo.ts` yet, so the `listing` job will fail. Either add demo data or skip the listing job for now.
4. **Pricing:** decided by the CEO (2026-11-05): Free with ads, Pro 1.99 USD/year, Business 4.99 USD/year. The pricing screen exists; there is no in-app purchase yet, so `asc_pro.py` is still not needed for the first build. See `reports/86_chot_gia_ten_goi_va_ci_todo.md`.
   **Naming:** the app and PDFs call the collection document "Phiếu thu" (not "Hóa đơn"), and the PDF footer says "Chứng từ nội bộ, không thay thế hóa đơn điện tử." The app name stays "Báo giá & Hóa đơn" for store search.
5. **Privacy policy URL and support email** are needed for the listing.

## Rule

Nothing is pushed and no tag is created without the CEO's approval (Gate 3 is the submit step).
