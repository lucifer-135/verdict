# Verdict — Design Spec

**Date:** 2026-10-28
**Hackathon:** YouCam API Skin AI & eCommerce VTO Hackathon (Devpost), Skin AI track
**Deadline:** 2026-11-02, 22:15 IST
**Status:** Design approved in chat; awaiting written-spec review

## 1. Understanding

### Intended outcome
A working, mobile-first web prototype that answers one question people ask in front of the mirror: *"Is this skincare product actually working, or am I wasting money?"* It must be a strong hackathon submission judged on technical implementation, design, potential impact and quality of idea.

### Who it is for
People who buy skincare and can't tell whether a product is doing anything. They often abandon products too early or keep paying for ones that do nothing.

### Success criteria
- Integrates YouCam Skin Analysis non-trivially (repeated scans, raw scores, masks) and chains it with Skin Simulation.
- A first-time user understands the value within one screen.
- Runs on a phone browser from a public URL; works end-to-end in the demo video.
- Repo is runnable by judges (README, env setup, mock mode).
- All Devpost submission fields drafted.

### Constraints
- 5 days to deadline.
- 1,000 free API units (plus any bonus units).
- Video must be 1–3 min, on YouTube, show the app running on a phone, and name the YouCam APIs used.

### Decisions made during brainstorming
- Track: Skin AI. Concept: per-product efficacy tracker ("Is It Working?").
- "Shelf Check" (ingredient-label matcher) is **out**. No LLM in the product.
- Platform: mobile-first Next.js web app (PWA-style), deployed on Vercel.
- Architecture: local-first. Server is a thin YouCam proxy only; all user data lives in IndexedDB on the device. No accounts.
- Demo data: real "import past selfies" backfill, plus a clearly labeled sample journey recorded from real API responses.

## 2. Product

**Name:** Verdict
**Tagline:** Stop guessing if your skincare works.

### Core concepts
- **Scan:** one Skin Analysis result for the person at a point in time. Scans are person-level: one scan feeds every active trial.
- **Trial:** one product being tested against 1–3 target concerns, with a start date (may be in the past).
- **Verdict:** the engine's judgment for a trial: *Too early*, *Working*, *Give it time*, *Not moving*, or *Pause*.

### Screens
1. **My Shelf (home).** A card per active trial: product name, days in, verdict chip, next check-in date. Empty state explains the idea in one line and offers "Start a trial" or "View sample journey".
2. **New trial.** Product name, target concerns (friendly labels, see §5.1), start date. Then baseline: take a scan now, or import past selfies.
3. **Goal preview.** Skin Simulation renders a realistic outcome for the simulable target concerns. The simulated image is analyzed by Skin Analysis to get a numeric goal score per target concern (§4.6). Before/goal slider.
4. **Check-in scan.** Camera view with a face-oval guide and a live brightness meter. Capture is blocked while the frame is too dark. Upload, poll and progress state. API quality errors become specific retake tips.
5. **Trial detail.**
   - Verdict card: big verdict, one-sentence reason, confidence.
   - Trend chart of `raw_score` per target concern over days, with the noise band shaded around the baseline and the goal as a dashed line.
   - Before / now / goal photo slider, with the selected concern's mask overlaid.
   - Side-effect watch: non-target concerns that worsened beyond noise.
   - Check-in timeline.
6. **Scan report.** All concern scores, overall score and skin age for one scan.
7. **Import past selfies.** Multi-select photos. The date comes from EXIF `DateTimeOriginal`, else the user enters it. Each import runs a scan (16 units); the UI shows the unit cost before confirming.
8. **Sample journey.** A read-only trial marked "Sample" everywhere it appears. Data is a fixture recorded from real API responses on real, consented, dated selfies.

### Out of scope
Accounts, cross-device sync, push notifications, shopping or product recommendations, LLM features, HD scans, region-level wrinkle and pore scores.

## 3. Architecture

```
Phone browser (Next.js client)
  ├─ Camera / import  ──►  image prep (resize, JPEG)
  ├─ IndexedDB (idb): scans, trials, blobs
  ├─ Verdict engine (pure TS)
  └─ fetch /api/*  ──►  Next.js route handlers (Vercel)
                           └─ YouCam client  ──►  YouCam API (s2s v2.0)
```

- The YouCam API key exists only in server env. The browser never sees it.
- The server stores nothing about users. A dev-only disk cache stores API results keyed by content hash (§6.3).
- Client polls the server; the server never long-polls. This avoids serverless timeouts.

### Units of code
| Unit | Purpose | Depends on |
|---|---|---|
| `lib/youcam/client.ts` | Upload, create task, poll for skin-analysis and skin-simulation. Normalizes responses. Maps error codes. | `fetch`, env |
| `lib/youcam/mock.ts` | Serves recorded fixtures when `YOUCAM_MOCK=1`. | fixtures |
| `lib/verdict/engine.ts` | Pure verdict computation. | none |
| `lib/verdict/concerns.ts` | Concern catalog: API name, label, fair-verdict window, simulable flag, simulation param name. | none |
| `lib/store/db.ts` | IndexedDB schema and typed accessors. | `idb` |
| `lib/image/prep.ts` | Resize/compress, brightness estimate, EXIF date read. | canvas, `exifr` |
| `app/api/scan/*`, `app/api/simulate/*` | Route handlers wrapping the client. | YouCam client |
| `app/(screens)/*` | UI screens from §2. | all of the above |

## 4. Verdict engine

Pure function: `computeVerdict(trial, scans, otherTrials, today) → { verdict, reason, confidence, perConcern, sideEffects, goalProgress, overlapWarning }`. Fully unit-tested.

### 4.1 Signal
`raw_score` only (1–100, higher = healthier). `ui_score` is adjusted upward by YouCam and is shown only in the scan report.

### 4.2 Baseline
- Baseline scans: valid scans dated from any time before `startDate` up to `startDate + 3 days`.
- Baseline value per concern: mean of baseline scans.
- If there are no baseline scans, use the first valid scan as baseline and add to the reason: "Late baseline (day N); earlier changes not counted." Confidence is capped at low.

### 4.3 Noise band
- Default: ±3 raw points per concern.
- If there are ≥2 baseline scans: `noise = max(3, max − min of baseline raw scores)` for that concern.
- Changes with |delta| < noise count as no change.

### 4.4 Delta and slope
- Post-baseline scans: valid scans dated after the baseline window.
- `delta` = mean of the last 2 post-baseline scans (or the only one) minus baseline.
- `slope` = least-squares slope of raw score vs days since start, over baseline and post-baseline scans.

### 4.5 Rules (evaluated in order; first match wins)
Per-trial verdict is derived from target concerns. With multiple targets: Pause if any target triggers Pause; otherwise Working if any target is Working; otherwise the earliest-in-order remaining verdict.

1. **Pause** — needs ≥1 post-baseline scan. A target concern has `delta ≤ −noise`, or a non-target `redness` or `acne` has `delta ≤ −2 × noise`. Reason names the concern and amount. Text: "Possible irritation. Consider pausing; see a dermatologist if it persists." *(Refinement from the chat design: Pause is checked before Too early, so irritation shows in week 1.)*
2. **Too early** — fewer than 2 post-baseline scans, or fewer than 14 days since start. Text includes when the first fair read is possible: "on <start + 14 days>" when fewer than 14 days have passed, or "after your next check-in" when only the scan count is missing.
3. **Working** — `delta ≥ noise` and `slope > 0`.
4. **Give it time** — days since start < the concern's window.
5. **Not moving** — days since start ≥ window and |delta| < noise. Text: "No measurable change after N weeks. Consider stopping — save your money."

### 4.6 Goal progress
- Goal score per simulable target concern = Skin Analysis `raw_score` of the simulated goal image.
- `goalProgress = clamp(delta / (goal − baseline), 0, 1)`. Hidden if the goal is missing or `goal − baseline ≤ noise`.

### 4.7 Confidence
Post-baseline valid scans: 2 → low, 3–4 → medium, ≥5 → high. Capped at low on late baseline.

### 4.8 Overlap warning
If another trial shares a target concern and the date ranges overlap within the concern's window, add: "Overlaps with <product>; their effects can't be separated."

### 4.9 Disclaimer
Shown on the trial detail and scan report: "Cosmetic insight, not medical advice."

## 5. YouCam integration

### 5.1 Concern catalog (SD)
| API name | Label | Window (days) | Target? | Simulable |
|---|---|---|---|---|
| `moisture` | Hydration | 14 | yes | no |
| `oiliness` | Oiliness | 28 | yes | yes |
| `radiance` | Radiance | 28 | yes | yes |
| `redness` | Redness | 28 | yes | yes |
| `acne` | Breakouts | 42 | yes | yes |
| `pore` | Pores | 56 | yes | yes |
| `texture` | Texture | 56 | yes | yes |
| `dark_circle_v2` | Dark circles | 56 | yes | yes |
| `eye_bag` | Eye bags | 56 | yes | yes |
| `age_spot` | Dark spots | 84 | yes | yes |
| `wrinkle` | Fine lines | 84 | yes | yes |
| `firmness` | Firmness | 84 | yes | no |
| `tear_trough` | Tear trough | 84 | yes | no |
| `droopy_upper_eyelid` | Upper eyelid | — | no | no |
| `droopy_lower_eyelid` | Lower eyelid | — | no | no |
| `skin_type` | Skin type | — | no (report only) | no |

Windows are heuristics based on the ~28-day skin cycle and are labeled as such in the UI. Simulation parameter names are confirmed in the spike (§5.4).

### 5.2 Skin Analysis flow
1. `POST {BASE}/s2s/v2.0/file` → presigned URL + `file_id`.
2. Server `PUT`s image bytes to the presigned URL.
3. `POST {BASE}/s2s/v2.0/task/skin-analysis` with `src_file_id`, `dst_actions` = all 16 SD concerns, `miniserver_args.enable_mask_overlay = false`, `format = "json"` → `task_id`.
4. Client polls `GET /api/scan/{taskId}` every 2 s, timeout 90 s. Server proxies `GET {BASE}/s2s/v2.0/task/skin-analysis/{task_id}`.
5. On `success`: normalize to `{ overall, skinAge, scores: {concern: {raw, ui}}, maskUrls: {concern: url} }`. The client downloads masks right away into IndexedDB (results expire after 24 h).
6. On `error`: map the code (§7). No units are charged.

Cost: 16 units per scan.

### 5.3 Skin Simulation flow (goal preview)
1. Reuse the baseline scan's uploaded `file_id` or upload again.
2. `POST {BASE}/s2s/v2.0/task/skin-simulation` with the simulable target concerns at intensity 0.4 (labeled "realistic").
3. Poll as above. Store the result image in IndexedDB.
4. Run Skin Analysis on the simulated image (public result URL, or re-upload) with only the target concerns → goal scores. Cost: 4 + 9 = 13 units per trial.

### 5.4 Live spike (first implementation task)
One real call per endpoint to confirm request and response shapes, because the docs disagree on `/file` vs `/file/skin-analysis` and don't fully show the simulation payload or `skin_type` output. Record responses as fixtures for `YOUCAM_MOCK`.

### 5.5 Environment
- `YOUCAM_API_KEY` — Bearer token.
- `YOUCAM_BASE_URL` — default `https://yce-api-01.makeupar.com`. Set differently for the India region if needed.
- `YOUCAM_MOCK` — `1` serves fixtures and spends no units.

## 6. Data

### 6.1 IndexedDB stores
- `scans`: `id`, `takenAt` (ISO), `source` (`camera` | `import` | `sample`), `photoBlobId`, `overall`, `skinAge`, `scores` (`{concern: {raw, ui}}`), `maskBlobIds` (`{concern: blobId}`), `skinType` (if returned).
- `trials`: `id`, `productName`, `concerns[]`, `startDate`, `goal` (`{imageBlobId, scores}` or null), `createdAt`, `isSample`, `archived`.
- `blobs`: `id` → `Blob`.

### 6.2 Image prep (client)
Resize so the short side ≥ 480 px and the long side ≤ 2560 px; JPEG quality 0.9; target 1–2 MB, hard max 4 MB (Vercel body limit is 4.5 MB). Brightness = mean luminance of the face-oval region; capture is blocked below a threshold.

### 6.3 Unit protection
- Dev-only disk cache at `.cache/youcam/`, keyed by SHA-256 of image bytes + endpoint + actions. Disabled in production.
- Import screen shows the unit cost before scanning.

## 7. Error handling
| Source | Handling |
|---|---|
| `error_lighting_dark` | "Too dark. Face a window or turn on a light, then retake." |
| `error_src_face_too_small` | "Move closer so your face fills the oval." |
| `error_src_face_out_of_bound` | "Center your face inside the oval." |
| `error_below_min_image_size` | "Photo is too small. Use a higher-resolution photo." |
| `error_exceed_max_image_size` | Should not happen after prep; resize again and retry once. |
| Task `error` (other) | "Scan failed. No units were charged." + Retry. |
| Poll timeout (90 s) | "Taking longer than usual." + Retry polling (not a new task). |
| Network / 5xx | Retry with backoff up to 2 times, then show Retry. |
| Missing EXIF date | Ask for the date before scanning. |
| IndexedDB unavailable (private mode) | Banner: "Private browsing can't save your history." App still scans. |

## 8. Testing
- **Vitest, verdict engine:** table-driven cases for every rule in §4.5, multi-target precedence, noise band from baseline spread, late baseline, goal clamp, overlap warning.
- **Vitest, YouCam client:** mocked `fetch` for upload → task → poll, error mapping, mock mode.
- **Vitest, image prep:** EXIF date present / missing.
- **Manual:** camera flow on a real Android or iOS phone before recording the video.

## 9. Stack
Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts, `exifr`, `idb`, Vitest. Deploy on Vercel. MIT license.

## 10. Submission deliverables
| Devpost field | Source |
|---|---|
| Project name, elevator pitch | `docs/submission.md` |
| About the project (Markdown story) | `docs/submission.md` |
| Built with | Stack list + YouCam Skin Analysis, Skin Simulation |
| Try it out | Vercel URL + GitHub repo |
| Image gallery | Screenshots of shelf, scan, verdict, goal preview, scan report |
| Video demo link | User records; script outline in `docs/submission.md` |
| Additional info answers (features/value, repo URL, API surprise, untapped use cases, technical wall) | `docs/submission.md` |
| App status | New |

## 11. Schedule
| Date | Work |
|---|---|
| Oct 28 | Spec, implementation plan |
| Oct 29 | Live spike + fixtures, scaffold, YouCam client, verdict engine (TDD) |
| Oct 30 | Scan flow, image prep, IndexedDB, My Shelf, new trial |
| Oct 31 | Trial detail, goal preview, import past selfies, scan report |
| Nov 1 | Sample journey fixture, polish, deploy, screenshots, submission text |
| Nov 2 | Video recording and upload, submit before 22:15 IST |

## 12. Risks
- **API shape differs from docs.** Mitigated by the day-one spike.
- **Units run out from judges using the live demo.** Sample journey costs nothing; watch the balance; claim the share-and-earn bonus units.
- **Scan noise is larger than ±3.** The noise band widens from the user's own baseline spread; the threshold is one constant to tune after the spike.
- **No real multi-week selfies available.** Need consented, dated selfies for the sample journey; otherwise the sample trial is shorter and labeled accordingly.
