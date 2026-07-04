# CO2 Emissions Narrative Visualization

An interactive narrative visualization of global CO2 emissions built with D3. The story follows a **martini glass** structure: three guided scenes lead the viewer through the data, then open into free-form exploration.

**Live site:** https://evanfebrianto.github.io/narrative-visualisation/

## Story

1. **The rise** — global annual CO2 emissions from 1850 to present
2. **Who emits** — top country emitters and the China/US crossover
3. **The twist** — the same countries viewed through per-capita emissions
4. **Explore** — compare countries, switch metrics, brush the timeline, and hover for details

## Tech

- [D3 v7](https://d3js.org/)
- [d3-annotation](https://d3-annotation.susielu.com/)
- Plain HTML, CSS, and JavaScript (no build step)

## Data

Trimmed from the [Our World in Data CO2 dataset](https://github.com/owid/co2-data), stored in `data/co2.csv`.

## Run locally

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/

## Project structure

```
index.html          # Page shell and navigation
css/style.css       # Layout and chart styling
js/main.js          # State, triggers, and scene dispatch
js/scenes.js        # Scene renderers and annotations
data/co2.csv        # Trimmed CO2 data
```

## Deployment

The site is deployed to GitHub Pages via `.github/workflows/pages.yml` on pushes to `master`.
