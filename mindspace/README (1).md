# MindSpace

*Small steps. Healthier mind. Better you.*

MindSpace is a student well-being web app for learning the biology of stress, checking in with your mood, practising gentle breathing and noticing healthy habits. It uses only HTML, CSS and JavaScript. There is no AI, no backend, no login and no account.

> MindSpace is an educational and self-reflection tool, not a diagnostic tool or a substitute for a qualified health professional. Ratings are self-reported and do not measure hormones, brain activity or any medical condition.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure for Home, Track, Learn, Breathe, Habits and Privacy |
| `style.css` | Design tokens, layout, components, responsive rules, reduced motion |
| `script.js` | Navigation, check-ins, insights, quiz, breathing timer, habits |

## How to run it on your computer

1. Make a folder named `MindSpace`.
2. Put `index.html`, `style.css`, `script.js` and `README.md` in the same folder.
3. Double-click `index.html`. It opens in your browser (Chrome, Edge, Firefox or Safari).

If your entries do not save when opened this way (some browsers restrict `file://` storage), start a tiny local server instead:

- With Python installed, open a terminal inside the folder and run `python -m http.server 8000`, then visit `http://localhost:8000`.
- Or in VS Code, install the "Live Server" extension, right-click `index.html` and choose "Open with Live Server".

## How to put it online (free)

**Netlify Drop (easiest, no account setup needed to try):**
1. Go to https://app.netlify.com/drop
2. Drag the whole `MindSpace` folder onto the page.
3. You get a public link to share.

**GitHub Pages:**
1. Create a free GitHub account and a new repository named `mindspace`.
2. Click "Add file" → "Upload files", drag in the four files and commit.
3. Open the repository's Settings → Pages. Under "Branch" choose `main` and `/ (root)`, then Save.
4. After a minute your site appears at `https://YOUR-USERNAME.github.io/mindspace/`.

## Features

- Home dashboard with real summaries from your saved data
- Mood and 1–10 perceived-stress check-in with an optional note
- History with single delete and "Clear all" (with confirmation)
- Insights: counts, latest rating, 7-day average, simple bar chart
- Learn: brain regions, fast stress response, HPA axis, short vs prolonged stress, recovery, 5-question quiz, source links
- Breathe: one-minute guided circle (4 seconds in, 4 seconds out) with Start, Stop and Restart
- Habits: five optional daily habits, saved per calendar date
- Privacy page and disclaimers; works with keyboard and screen readers; respects reduced motion

## Storage keys

`mindspace.entries.v1` (check-ins) and `mindspace.habits.v1` (habits by date, `YYYY-MM-DD`). Data stays in your browser only.

## Simplified in this version

- The chart is a plain CSS bar chart, so no Chart.js or internet is needed.
- Entries can be deleted but not edited.
- Breathing has no pause/resume.
- Source links go to the main sites of NCCIH, CDC, PubMed Central and Annual Reviews. Search them for the O'Connor, Thayer and Vedhara review.

## Known limitations

- Browser storage is not secure; anyone using the same browser can see entries.
- Clearing browser data erases entries.
- Not tested on every browser and screen size.
