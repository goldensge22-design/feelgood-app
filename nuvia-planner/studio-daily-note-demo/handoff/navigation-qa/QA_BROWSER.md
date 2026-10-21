# Studio navigation browser QA — final post-refinement recheck

Reloaded the Studio demo after the narrow-nav CSS update. This focused continuation rechecked only mobile navigation; the earlier desktop/content run remains as a pre-refinement baseline below. No source files were edited and nothing was published.

## Final results

- At 360×900, Settings remained active across all 15 locales. Grid children span 10/10/7/13 equal tracks (Now/Plan/Reflect/More); widths are 164.5/164.5/113.94/215.06px.
- Russian is the only 360px two-line case: active Settings button 57.78px high and nav 119.78px. Other 14 locales have 44px buttons and 106px nav. All buttons meet 44px, all text fits its measured box, and no document horizontal overflow was found (document width 345px, viewport 360px).
- Every locale has 160px root bottom padding, exceeding the maximum nav height. RU `копирование` was measured as a single 96.23×19px text rect at 360 and 375; `word-break: keep-all`, `overflow-wrap: normal`.
- Arabic More at 360px: popup x=6,y=642,w=200,h=202; all four menu items are 186×44px, fully inside the viewport (y=649/697/745/793). Khmer Reflect fits its 113.94×44px cell with scroll/client 36/36.
- RU Settings at 375px: More 224.81×57.78px, Reflect 119.19×57.78px, nav 360×119.78px. FR Settings at 375px: More 224.81×44px, Reflect 119.19×44px, nav 360×106px. Both document widths are 360px (viewport 375px).
- Screenshots: RU360 `r3kjue`; RU375 `79nmxn`; FR360 `pxfjr2`; FR375 `r0fzt0`; Arabic More360 `n5b4hs`; Khmer360 `72pnvl`.
- Full post-refinement per-locale metrics are under `postRefinement` in `matrix.json`. Historic desktop and 7-page mobile records are retained and tagged `pre-refinement`; desktop/content were not rerun in this continuation.

## Historic initial pass (pre-refinement baseline; not final CSS measurements)

- Route: `/studio.html?demo=school` (synthetic school demo).
- Coverage: 15 locales × Settings + Now/Plan/Reflect/Report/Roadmap/Growth at 360×900 and 1440×1000; 120 records per viewport. Extra Russian/French Settings samples at 375×900.
- Browser: Playwright preview; `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36`. Physical iPhone Safari was not tested.
- No source files edited; no publish action; generated artifacts only. No real/personal data entered.

## Results

- Missing locale/view rows: 0; navigation labels missing: 0. Horizontal overflow rows: 0; buttons below 44px: 0; internally clipped nav-button text: 0.
- Settings stayed active after each language switch. At 360px, root bottom padding was 160px; all 15 bottom-scroll checks had positive clearance above fixed navigation (minimum 33.09px).
- Report/Growth do not expose a `page-`/`section-` marker in the generic probe. Their localized destination labels are stored in each row; representative live checks showed the monthly report, options, preview/print/download controls and Growth method/goal/actual-work/comparison/review controls.
- Keyboard: Tab moved focus from Now to Plan; Enter activated Plan.

## Per-locale Settings nav geometry (desktop; mobile 360×900)

| Locale | 1440×1000 | 360×900 |
|---|---|---|
| ko | nav 1372×48px; max button 93.359375×48px; pad 0px; root undefined; docΔ -15px | nav 345×106px; max button 164.5×44px; pad 6px; root 160px; docΔ -15px |
| en | nav 1372×48px; max button 157.921875×48px; pad 0px; root undefined; docΔ -15px | nav 345×106px; max button 164.5×44px; pad 6px; root 160px; docΔ -15px |
| ja | nav 1372×48px; max button 174.015625×48px; pad 0px; root undefined; docΔ -15px | nav 345×106px; max button 164.5×44px; pad 6px; root 160px; docΔ -15px |
| zh-CN | nav 1372×48px; max button 110.015625×48px; pad 0px; root undefined; docΔ -15px | nav 345×106px; max button 164.5×44px; pad 6px; root 160px; docΔ -15px |
| zh-TW | nav 1372×48px; max button 110.015625×48px; pad 0px; root undefined; docΔ -15px | nav 345×106px; max button 164.5×44px; pad 6px; root 160px; docΔ -15px |
| mn | nav 1372×48px; max button 210.765625×48px; pad 0px; root undefined; docΔ -15px | nav 345×119.78125px; max button 164.5×57.78125px; pad 6px; root 160px; docΔ -15px |
| th | nav 1372×48px; max button 196.46875×48px; pad 0px; root undefined; docΔ -15px | nav 345×106px; max button 164.5×44px; pad 6px; root 160px; docΔ -15px |
| vi | nav 1372×48px; max button 169.59375×48px; pad 0px; root undefined; docΔ -15px | nav 345×106px; max button 164.5×44px; pad 6px; root 160px; docΔ -15px |
| ar | nav 1372×48px; max button 211.453125×48px; pad 0px; root undefined; docΔ -15px | nav 345×119.78125px; max button 164.5×57.78125px; pad 6px; root 160px; docΔ -15px |
| ru | nav 1372×48px; max button 339.140625×48px; pad 0px; root undefined; docΔ -15px | nav 345×138.671875px; max button 164.5×76.671875px; pad 6px; root 160px; docΔ -15px |
| km | nav 1372×48px; max button 155.515625×48px; pad 0px; root undefined; docΔ -15px | nav 345×106px; max button 164.5×44px; pad 6px; root 160px; docΔ -15px |
| es | nav 1372×48px; max button 252.125×48px; pad 0px; root undefined; docΔ -15px | nav 345×119.78125px; max button 164.5×57.78125px; pad 6px; root 160px; docΔ -15px |
| fr | nav 1372×48px; max button 235.59375×48px; pad 0px; root undefined; docΔ -15px | nav 345×119.78125px; max button 164.5×57.78125px; pad 6px; root 160px; docΔ -15px |
| it | nav 1372×48px; max button 207.265625×48px; pad 0px; root undefined; docΔ -15px | nav 345×119.78125px; max button 164.5×57.78125px; pad 6px; root 160px; docΔ -15px |
| az | nav 1372×48px; max button 257.046875×48px; pad 0px; root undefined; docΔ -15px | nav 345×119.78125px; max button 164.5×57.78125px; pad 6px; root 160px; docΔ -15px |

All exact per-page button widths/heights, nav bounds/padding, root padding, document overflow delta, localized nav text and section markers are in `matrix.json`.

## Additional 375×900 Settings samples

- Russian: button 172×76.67px; nav 360×138.67px; text scroll/client 69/69px; root padding 160px; document width 360px.
- French: button 172×57.78px; nav 360×119.78px; text scroll/client 50/50px; root padding 160px; document width 360px.
- Both use `word-break: keep-all` and `overflow-wrap: normal`; text fits without horizontal overflow.

## Console/error observations

Repeated Report-preview navigation logged sandbox-blocked script execution in `about:srcdoc` because `allow-scripts` was absent; the sandbox was not disabled. After attaching console-error/pageerror listeners for a later Report visit, no new events were recorded (`[]`).

## Screenshot evidence IDs

- Korean 360: `9bzasx`; Mongolian 360: `7skgxd`; Azerbaijani 360: `ut6p4k`; Russian 360: `g8wchj`; French 360: `tbgljo`; Arabic mobile menu 360: `4ynig9`.
- Desktop: `16tjxu`; French Settings 375: `zwjt81`; final Russian Settings 375: `8eoz30`.
