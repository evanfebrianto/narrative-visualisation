# Essay: CO2 Emissions Narrative Visualization

Visualization URL: https://evanfebrianto.github.io/narrative-visualisation/

## Messaging

The message of this narrative visualization is that global CO2 emissions have grown dramatically since 1950, that much of the annual total is driven by a small group of countries, and that per-capita emissions complicate how responsibility should be interpreted. Total emissions show scale and current climate impact, while per-capita emissions show individual intensity and historical development patterns. The visualization is designed to lead the viewer from the global problem, to the largest country contributors, and finally to the contrast between total and per-person emissions.

## Narrative Structure

This project uses a martini glass structure. The first three scenes form the narrow stem of the glass: the viewer follows an author-led sequence with Previous and Next buttons and no free-form exploration controls. Scene 1 establishes the global rise in emissions, Scene 2 narrows the view to the largest country emitters, and Scene 3 reframes the same countries using per-capita emissions.

The final scene forms the wider bowl of the glass. At that point, the viewer can explore freely by selecting an additional country, switching between total emissions and per-capita emissions, brushing the timeline, and hovering over lines for exact values. This preserves the guided message before opening the visualization to user-driven exploration.

## Visual Structure

Each scene uses the same visual template: a line chart with a consistent title area, explanatory scene summary, axis placement, legend position, color palette, and annotation style. This consistency helps the viewer navigate each scene because the chart layout does not need to be relearned as the data changes.

The visual structure leads attention in a deliberate order. The scene title explains the point of the scene, the chart shows the evidence, the legend identifies the series, and callout annotations highlight the most important events or comparisons. Animated line drawing and scene fade-ins help transitions feel continuous rather than abrupt, keeping the viewer oriented as the narrative moves from global totals to country totals to per-capita comparisons.

## Scenes

Scene 1, “The post-1950 surge changed the scale of the problem,” shows global annual CO2 emissions from 1850 through the latest available data. It introduces the central problem by showing how small the early values were compared with the rapid post-1950 increase.

Scene 2, “A small group of countries drives much of the annual total,” shows total annual CO2 emissions for China, the United States, India, Russia, and Japan. This scene narrows the global story to major country contributors and marks the point where China overtakes the United States in annual emissions.

Scene 3, “Per-capita emissions complicate the responsibility story,” uses the same countries but switches the metric to CO2 per person. This keeps the visual structure familiar while changing the interpretation: large total emitters do not necessarily have the largest per-person emissions.

Scene 4, “Explore the bowl,” opens the interactive portion of the martini glass. The viewer can compare the top five emitters with another selected country, choose the metric, brush the year range, and hover over the lines for details.

## Annotations

The annotations follow a consistent callout-circle template using `d3-annotation`. Each annotation has a subject circle, connector, title, and short explanatory label. This template is reused across scenes so annotations feel like part of the narrative structure rather than separate decoration.

In Scene 1, annotations identify the low 1850 baseline and the post-1950 acceleration. In Scene 2, an annotation marks the China/United States crossover in annual emissions. In Scene 3, annotations emphasize the high United States per-capita footprint and India’s lower per-capita intensity despite its large total emissions. In the final scene, an annotation reminds the viewer that hover interactions provide exact values during exploration.

## Parameters

The visualization is controlled by a small set of state parameters in JavaScript:

```js
{
  sceneIndex,
  selectedCountries,
  metric,
  yearRange
}
```

`sceneIndex` determines which scene is rendered. `selectedCountries` determines which country lines appear in the exploration scene. `metric` switches between total annual CO2 emissions and CO2 per capita. `yearRange` determines the x-axis domain and is updated by the brush interaction in the final scene.

These parameters define the state of the narrative visualization. Whenever one of them changes, the chart is cleared and redrawn using the same scene renderer and visual template.

## Triggers

The Previous and Next buttons are triggers that change `sceneIndex`, moving the viewer through the author-led portion of the martini glass. These buttons are the only available controls during the first three scenes, which preserves the intended guided sequence.

In the final scene, new triggers become available. The country dropdown changes `selectedCountries`, the metric buttons change `metric`, the brush changes `yearRange`, and hover events show a tooltip with exact year and value information. The controls are visually grouped above the chart, and the scene summary explicitly tells the viewer that this is the exploratory portion of the visualization.

## Data Source

The data comes from the Our World in Data CO2 dataset: https://github.com/owid/co2-data. The project uses a trimmed CSV containing country and world records from 1850 onward with the fields needed for the visualization.
