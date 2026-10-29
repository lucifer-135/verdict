# YouCam API — confirmed shapes (spike, 2026-10-29)

Recorded by `scripts/spike.ts` against `https://yce-api-01.makeupar.com`. Raw responses are in `fixtures/youcam/`. Where this file differs from the design spec §5, this file wins.

## Auth
`Authorization: Bearer <YOUCAM_API_KEY>` on every `/s2s/v2.0/*` call. Not sent to presigned S3 URLs.

## File upload
1. `POST /s2s/v2.0/file` (no per-feature suffix), JSON body:
   ```json
   { "files": [{ "content_type": "image/jpeg", "file_name": "scan.jpg", "file_size": 123456 }] }
   ```
   Response: `data.files[0].file_id` and `data.files[0].requests[0]` = `{ method: "PUT", url, headers: { "Content-Length", "Content-Type" } }`.
2. `PUT` the raw bytes to `requests[0].url` with exactly `requests[0].headers`. Returns 200 with an empty body.

A `file_id` can be reused: the same id ran a skin-analysis task and then a skin-simulation task.

## Skin Analysis
- Create: `POST /s2s/v2.0/task/skin-analysis`
  ```json
  { "src_file_id": "<file_id>", "dst_actions": ["wrinkle", "..."], "miniserver_args": { "enable_mask_overlay": false }, "format": "json" }
  ```
  Response: `data.task_id`.
- Poll: `GET /s2s/v2.0/task/skin-analysis/{task_id}` (task id URL-encoded). `data.task_status` is `running` | `success` | `error`. While running, `data.results` is `null`.
- Success: `data.results.output[]`, one entry per item:
  - Concerns: `{ type, raw_score, ui_score, mask_urls: [url], url: null }`
  - `{ type: "all", score }` → overall score (e.g. 80.8). Present in JSON; no ZIP needed.
  - `{ type: "skin_age", score }` → skin age (e.g. 21).
  - `skin_type`: three entries, `{ type: "skin_type", region: "whole" | "t_zone" | "u_zone", skin_type: "Combination" }` (string, no score). Use the `whole` region.
  - `{ type: "resize_image" }` → mask URL is the resized input photo. Ignore it.
  - With a subset of actions (e.g. `["oiliness", "pore"]`), `all` and `skin_age` are present with `score: null`.
- Error: `data.task_status: "error"`, `data.error` = code, `data.error_message` = text, `data.results: null`. No units are charged. Observed codes:
  - `error_src_face_too_small` ("needs to take up more than 60% of the image width")
  - `error_below_min_image_size` (300×300 image)
  - `error_download_image` (when `src_file_url` pointed at a Skin Simulation result URL; took 70 s)
- Timing: 3.5–5.6 s for 16 SD concerns; error results in about 3 s.

## Masks
- Host: `yce-us.s3-accelerate.amazonaws.com` (presigned). Downloadable with a plain GET; no auth header.
- Format: full-size **PNG with transparency** (same size as the resized input): a colored heatmap on a transparent background. It can be laid directly over the photo. (Corrected 2026-10-29: the spike saved these with a `.jpg` name because S3 does not label them `image/png`; `/api/asset` therefore detects the type from the bytes. Converting a mask to JPEG flattens the transparency to black.)
- Identical input gives identical scores: re-running the same six sample photos reproduced every raw score exactly.

## Skin Simulation
- Create: `POST /s2s/v2.0/task/skin-simulation` with a flat body. Each concern is a top-level number 0–1 (at least one > 0):
  ```json
  { "src_file_id": "<file_id>", "oiliness": 0.4, "pores": 0.4 }
  ```
  Keys: `wrinkle`, `radiance`, `oiliness`, `acne`, `eye_bags`, `dark_circle`, `spots`, `pores`, `texture`, `redness`. The catalog maps these via `ConcernInfo.simKey`.
- Poll: `GET /s2s/v2.0/task/skin-simulation/{task_id}`. Success: `data.results.url` (JPEG on `yce-us.s3-accelerate.amazonaws.com`, valid 2 h). Error codes are the same family (`error_src_face_too_small` observed).
- Timing: 7.5 s.

## Goal score (simulation → analysis)
Passing the simulation result URL as `src_file_url` **fails** (`error_download_image`). Instead, download the result image and upload it through `POST /s2s/v2.0/file`, then run skin-analysis with `src_file_id`.

Observed at intensity 0.4: oiliness raw 72.1 → 96.5, pores 58.5 → 79.1.

## Scan noise
Same photo re-framed (crop 656×1100 of 736×1236) vs the original:
- Largest |Δ raw| = 0.99 (`tear_trough`), then 0.67 (`pore`), 0.50 (`moisture`). All others ≤ 0.26.

The ±3 default noise band is well above framing noise. Lighting changes between real captures are not measured here; 3 stays the default.

## Asset allowlist
`ASSET_HOSTS = ['yce-us.s3-accelerate.amazonaws.com']`

## Units spent in the spike
About 61: three 16-concern scans (48), one simulation (4) and one 2-concern goal scan (9). Error tasks are not charged.
