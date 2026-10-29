# Devpost submission drafts

Copy each section into the matching field on the Devpost form. Text in `<angle brackets>` needs your own value before you submit.

---

## Project overview

### Project name (60 characters maximum)

Verdict: Find Out If Your Skincare Is Really Working

### Elevator pitch (200 characters maximum)

Verdict compares repeated YouCam Skin AI scans to show whether a skincare product is improving the concern it targets, and advises you to keep going, give it more time, or stop.

---

## Project details

### About the project (Markdown)

```markdown
## Inspiration

Most people who buy skincare cannot tell whether a product is doing anything. Changes are slow, the mirror is unreliable, and lighting changes from day to day. As a result, many people stop using a good product too early, or keep paying for one that does not help them. We wanted to answer one question that people ask in front of the mirror: "Is this product actually working?"

## What it does

Verdict turns YouCam AI Skin Analysis into a product trial.

1. The user names a product, chooses up to three concerns it should improve (for example, oiliness and pores), and sets the start date.
2. The user takes a baseline scan, or imports dated selfies from before they started.
3. YouCam Skin Simulation shows a realistic goal for those concerns. Verdict then analyzes the simulated image, so the goal has a number and not only a picture.
4. The user checks in about once a week. Each check-in is a full 16-concern skin analysis.
5. Verdict gives a verdict with a plain reason, for example: "Oiliness improved 5 pts in 3 weeks, above normal scan noise (±3). Keep going."

The five verdicts are **Working**, **Give it time**, **Not moving**, **Pause** (possible irritation) and **Too early**. The trial page also shows a trend chart with the noise band and the goal line, a before-and-now comparison with the YouCam heatmap for the selected concern, a side-effect watch for other concerns, and a warning when two products target the same concern at the same time.

The app includes a **simulated sample journey** so that judges can see a full six-week trial without waiting six weeks. It uses AI-generated photos of one person, which we analyzed with the real YouCam API: breakouts improved from a raw score of 50 to 77, and the verdict is **Working** with high confidence. The app labels this trial as a simulated sample and states that it does not show a real user.

## How we built it

- **Next.js 15, React 19, TypeScript and Tailwind CSS**, designed mobile-first for phone browsers.
- **YouCam AI Skin Analysis v2** (SD, all 16 concerns) for every check-in. Verdict uses `raw_score` for its decisions, because the documentation explains that `ui_score` is adjusted upward to be encouraging.
- **YouCam AI Skin Simulation** at intensity 0.4 to build the realistic goal, followed by a second Skin Analysis of the simulated image to get the goal score.
- A **pure TypeScript verdict engine** with a unit test for every rule: baseline averaging, a noise band, fair-verdict windows per concern, side-effect detection and overlap warnings.
- **Privacy by design:** photos, scores and trials stay in the browser (IndexedDB). The server only forwards requests to YouCam, so the API key never reaches the browser.
- A **mock mode** with recorded API responses, so the app can be developed and tested without spending units.

## Challenges we ran into

- **Separating real change from scan noise.** We scanned the same photo with two different framings. The raw scores moved by at most 1 point. Verdict therefore treats changes smaller than 3 points as no change, and widens that band when a user's own baseline scans vary more.
- **Scoring the simulated goal.** Passing the Skin Simulation result URL straight back into Skin Analysis failed with `error_download_image`. We now download the simulated image and upload it again through the File API.
- **Capturing usable selfies.** Our first test selfie was rejected because the face covered less than 60% of the image width. The camera screen now shows an oval guide sized for this requirement, crops to a portrait frame, and blocks capture when the light is too dark.
- **A limited unit budget.** Every full scan costs 16 units, so we added recorded fixtures, a development cache and duplicate detection for imported photos.

## Accomplishments that we're proud of

- The goal is measurable: Skin Simulation and Skin Analysis work together to produce a realistic target score.
- The app explains every verdict in one plain sentence and states its confidence.
- The verdict engine is fully unit-tested, and the whole test suite runs without calling the API.

## What we learned

- Raw scores and user-facing scores serve different purposes. Raw scores are the right measure for tracking change.
- A fair verdict needs time. Different concerns need different waiting periods, and the app should say so honestly.
- Good capture guidance improves results more than any later correction.

## What's next for Verdict

- We will run multi-week trials with volunteers to calibrate the noise band and the waiting period for each concern.
- We plan to add optional reminders for weekly check-ins.
- We would like to explore a brand version, where a product's own trial results could support honest efficacy claims.
```

### Built with (tags)

next.js, react, typescript, tailwind-css, youcam-api, youcam-skin-analysis, youcam-skin-simulation, indexeddb, recharts, vitest, vercel

### Image gallery

Upload these files from `docs/screenshots/` (3:2 ratio, under 5 MB each):

1. `gallery-1-verdict.png`: the first screen, the verdict and the trend chart.
2. `gallery-2-youcam.png`: the heatmap comparison, the realistic goal and the skin report.
3. `gallery-3-flow.png`: starting a trial, the weekly check-in and the shelf.

Single phone screens are in `docs/screenshots/phone/` if you want more images.

### "Try it out" links

- `<GitHub repository URL>`
- `<Vercel live demo URL>`

### Video demo link

`<YouTube URL>`

---

## Additional info (for judges)

### Upload a file

Optional. You can upload a zip of the repository if you want, but the repository link is required either way.

### Submitter type

`<Individual / Team / Organization>`

### Country of residence

`<Your country>`

### App status

New

### If existing, explain what you updated during the submission period

Not applicable. Verdict was built from scratch during the submission period.

### Features, functionality, and consumer or retail value

Verdict helps consumers decide, with evidence, whether to keep using a skincare product. The user starts a trial for a product, chooses the concerns it should improve, and checks in with a selfie about once a week. Each check-in is a full YouCam Skin Analysis. Verdict compares the raw scores against the user's own baseline, ignores changes that are within normal scan noise, waits a fair amount of time for each concern, and then gives one of five verdicts with a one-sentence reason. A realistic goal, built with YouCam Skin Simulation and scored with Skin Analysis, shows what success could look like and how far the user has progressed.

For consumers, the value is fewer wasted purchases and less guesswork. People may stop products that are not helping them, keep going with products that are helping, and pause products that may be irritating their skin. For retailers and brands, the same approach could support results-based guarantees and honest efficacy claims, and it may reduce returns from customers who give up before a product has had time to work.

### URL to the code repository for judging and testing

`<GitHub repository URL>` (public, MIT license). The README explains how to run the app with a YouCam API key, or without one in mock mode.

### Was there a moment during the hackathon where the API surprised you, in a good or frustrating way?

There were both kinds of moments. A good surprise was how much one Skin Analysis call returns: 15 concern scores, each with a raw score and a user-facing score, plus the overall score, skin age, skin type and a full-size heatmap mask for each concern, usually in 3 to 6 seconds. The masks are transparent PNG images, so we could lay them directly over the user's photo. A frustrating moment came when we tried to analyze a Skin Simulation result by passing its URL directly. The task ran for about 70 seconds and then failed with `error_download_image`. Downloading the image and uploading it again through the File API solved the problem.

### Are there industries or use cases you think Perfect Corp.'s API could serve that nobody is talking about yet?

- **Efficacy evidence for skincare brands:** Repeated, standardized at-home scans could give brands real-world before-and-after data from their own customers, with the customers' consent.
- **Results-based retail guarantees:** Retailers could offer a refund or exchange when a product shows no measurable change after a fair trial period.
- **Follow-up between dermatology visits:** Patients could share consistent progress data with their dermatologist between appointments, as cosmetic tracking alongside professional care.
- **Beauty device makers:** Brands that sell devices such as LED masks could help customers check whether their routine is producing measurable change.

### Where did you hit a wall technically? How did you work around it?

The main wall was deciding when a change in score is real. Scores move a little between scans even when nothing has changed, so a simple before-and-after comparison could produce false verdicts. We measured the variation on a re-framed photo (at most 1 point), set a conservative default noise band of 3 raw points, and let the band grow when a user's own baseline scans vary more. We also added a fair waiting period for each concern, so the app says "Too early" or "Give it time" instead of making a premature judgment.

The second wall was the goal score. Skin Analysis could not download a Skin Simulation result URL, so we download the simulated image ourselves and upload it again through the File API before analyzing it.

### Share a link to any social posts about your project

`<Optional social post URL>`

---

## Demo video script (about 2 minutes 30 seconds)

Record the app on a phone (screen recording) and add voice-over. Do not use copyrighted music. Both YouCam APIs must be named.

| Time | What the viewer sees | Voice-over |
|---|---|---|
| 0:00–0:15 | The empty shelf screen with the example verdict card. | "Most people cannot tell whether their skincare is working. Verdict answers that question using the YouCam Skin AI API." |
| 0:15–0:35 | Start a trial: type the product name, choose Oiliness and Pores, keep today's date. | "I start a trial for a niacinamide serum and choose the two concerns it promises to improve: oiliness and pores." |
| 0:35–0:55 | The camera screen with the oval guide and the light check, then the scan progress steps. | "The camera guides my framing and checks the light. Each check-in is a full YouCam AI Skin Analysis of 16 concerns, and the result arrives in a few seconds." |
| 0:55–1:20 | On the shelf, tap "View sample journey", then open its goal page: drag the Before and Goal slider and show the goal scores. | "To show a full trial, Verdict includes a simulated sample made from AI-generated photos. YouCam AI Skin Simulation creates a realistic goal, and Verdict analyzes that simulated image too, so the goal has a number: breakouts from 50 to 79." |
| 1:20–1:50 | The sample trial page: the verdict card, the trend chart with the noise band and the goal line. | "After six weekly check-ins, Verdict compares the raw scores with the baseline. Changes inside the shaded band are normal scan noise. Here, breakouts improved by 24 points, well beyond the noise, so the verdict is Working with high confidence." |
| 1:50–2:10 | Before and Now comparison with the breakouts heatmap turned on. | "The comparison shows the first and latest photos with the YouCam heatmap for breakouts. Verdict also watches other concerns, such as redness, and suggests a pause if they get worse." |
| 2:10–2:30 | The skin report for one scan; the shelf with the verdict chip. | "Every scan also gives a full skin report. My photos stay on my phone. Verdict helps people keep the products that work and stop paying for the ones that do not." |
