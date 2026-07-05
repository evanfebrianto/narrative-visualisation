(function () {
  const config = {
    width: 960,
    height: 620,
    margin: { top: 64, right: 164, bottom: 120, left: 82 },
    colors: {
      World: "#b45309",
      China: "#c2410c",
      "United States": "#2563eb",
      India: "#16a34a",
      Russia: "#9333ea",
      Japan: "#db2777"
    }
  };

  const fallbackColor = d3.scaleOrdinal(d3.schemeTableau10);

  const sceneCopy = [
    {
      kicker: "Scene 1 of 4",
      title: "The post-1950 surge changed the scale of the problem",
      summary:
        "Global annual CO2 emissions were modest by modern standards for most of the record, then accelerated sharply after 1950."
    },
    {
      kicker: "Scene 2 of 4",
      title: "A small group of countries drives much of the annual total",
      summary:
        "The guided story narrows from the global total to the largest country emitters, revealing a shift in leadership during the 2000s."
    },
    {
      kicker: "Scene 3 of 4",
      title: "Per-capita emissions complicate the responsibility story",
      summary:
        "The same countries look different when emissions are divided by population: totals and per-person impact answer different questions."
    },
    {
      kicker: "Scene 4 of 4",
      title: "Explore the bowl: choose a country, metric, and time window",
      summary:
        "The author-led path now opens into free-form exploration. Use the controls, hover over lines, and brush the timeline to compare patterns."
    }
  ];

  function getSceneCopy(sceneIndex) {
    return sceneCopy[sceneIndex];
  }

  function colorFor(name) {
    return config.colors[name] || fallbackColor(name);
  }

  function getMetric(metric) {
    if (metric === "co2_per_capita") {
      return {
        key: "co2_per_capita",
        label: "CO2 per person (tonnes)",
        shortLabel: "Tonnes per person",
        axisFormat: (value) => d3.format(".0f")(value),
        tooltipFormat: (value) => `${d3.format(",.2f")(value)} tonnes per person`
      };
    }

    return {
      key: "co2",
      label: "CO2 emissions (million tonnes)",
      shortLabel: "Annual emissions",
      axisFormat: (value) => {
        if (value >= 1000) {
          const gigatonnes = value / 1000;
          const format = gigatonnes < 10 && !Number.isInteger(gigatonnes) ? ".1f" : ".0f";
          return `${d3.format(format)(gigatonnes)} Gt`;
        }
        return d3.format(".0f")(value);
      },
      tooltipFormat: (value) => `${d3.format(",.1f")(value)} million tonnes`
    };
  }

  function cleanValues(data, country, metric, yearRange) {
    const metricInfo = getMetric(metric);
    return data
      .filter((row) => {
        return (
          row.country === country &&
          Number.isFinite(row[metricInfo.key]) &&
          row.year >= yearRange[0] &&
          row.year <= yearRange[1]
        );
      })
      .sort((a, b) => d3.ascending(a.year, b.year));
  }

  function buildSeries(data, countries, metric, yearRange) {
    return countries
      .map((country) => ({
        name: country,
        values: cleanValues(data, country, metric, yearRange)
      }))
      .filter((series) => series.values.length > 1);
  }

  function nearestYear(values, year) {
    return values.reduce((nearest, value) => {
      return Math.abs(value.year - year) < Math.abs(nearest.year - year) ? value : nearest;
    }, values[0]);
  }

  function latestValue(values) {
    return values[values.length - 1];
  }

  function maxSeriesValue(series, key) {
    return d3.max(series, (group) => d3.max(group.values, (row) => row[key])) || 1;
  }

  function findChinaUsCrossover(data) {
    const chinaRows = cleanValues(data, "China", "co2", [1900, 2100]);
    const usByYear = new Map(cleanValues(data, "United States", "co2", [1900, 2100]).map((row) => [row.year, row.co2]));

    for (let index = 1; index < chinaRows.length; index += 1) {
      const previous = chinaRows[index - 1];
      const current = chinaRows[index];
      const previousUs = usByYear.get(previous.year);
      const currentUs = usByYear.get(current.year);

      if (!Number.isFinite(previousUs) || !Number.isFinite(currentUs)) {
        continue;
      }

      const previousGap = previous.co2 - previousUs;
      const currentGap = current.co2 - currentUs;

      if (previousGap <= 0 && currentGap > 0) {
        const progress = previousGap / (previousGap - currentGap);
        return {
          year: previous.year + progress * (current.year - previous.year),
          value: previous.co2 + progress * (current.co2 - previous.co2),
          labelYear: current.year
        };
      }
    }

    return { year: 2006, value: usByYear.get(2006) || 6000, labelYear: 2006 };
  }

  function setupFrame(context) {
    const svg = context.svg;
    svg.selectAll("*").interrupt();
    svg.selectAll("*").remove();

    const innerWidth = config.width - config.margin.left - config.margin.right;
    const innerHeight = config.height - config.margin.top - config.margin.bottom;
    const root = svg
      .append("g")
      .attr("class", "scene-root")
      .attr("opacity", 0);

    root.transition().duration(280).attr("opacity", 1);

    const plot = root
      .append("g")
      .attr("transform", `translate(${config.margin.left},${config.margin.top})`);

    return { root, plot, innerWidth, innerHeight };
  }

  function drawAxes(frame, x, y, metricInfo, axisOptions = {}) {
    const xAxis = d3
      .axisBottom(x)
      .tickFormat(d3.format("d"))
      .ticks(axisOptions.hasBrush ? 6 : 8)
      .tickPadding(axisOptions.hasBrush ? 4 : 8);
    const yAxis = d3.axisLeft(y).ticks(6).tickFormat(metricInfo.axisFormat);
    const yGrid = d3
      .axisLeft(y)
      .ticks(6)
      .tickSize(-frame.innerWidth)
      .tickFormat("");

    frame.plot
      .append("g")
      .attr("class", "grid")
      .call(yGrid);

    frame.plot
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${frame.innerHeight})`)
      .call(xAxis);

    frame.plot.append("g").attr("class", "axis").call(yAxis);

    frame.plot
      .append("text")
      .attr("class", "axis-label")
      .attr("x", frame.innerWidth / 2)
      .attr("y", frame.innerHeight + (axisOptions.hasBrush ? 28 : 40))
      .attr("text-anchor", "middle")
      .text("Year");

    frame.plot
      .append("text")
      .attr("class", "axis-label")
      .attr("x", -frame.innerHeight / 2)
      .attr("y", -56)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text(metricInfo.label);
  }

  function focusSetFromOptions(options) {
    if (options.focusCountries?.length) {
      return new Set(options.focusCountries);
    }
    if (options.focusCountry) {
      return new Set([options.focusCountry]);
    }
    return new Set();
  }

  function isFocusedCountry(name, focusSet) {
    return focusSet.has(name);
  }

  function drawLines(context, frame, series, x, y, metricInfo, options) {
    const focusSet = focusSetFromOptions(options);
    const hasFocus = focusSet.size > 0;
    const line = d3
      .line()
      .defined((row) => Number.isFinite(row[metricInfo.key]))
      .x((row) => x(row.year))
      .y((row) => y(row[metricInfo.key]))
      .curve(options.curve || d3.curveMonotoneX);

    const paths = frame.plot
      .append("g")
      .attr("class", "series-layer")
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("class", (group) => {
        const classes = ["line-path"];
        if (hasFocus && isFocusedCountry(group.name, focusSet)) {
          classes.push("is-focused");
        } else if (hasFocus) {
          classes.push("is-muted");
        }
        return classes.join(" ");
      })
      .attr("data-country", (group) => group.name)
      .attr("stroke", (group) => colorFor(group.name))
      .attr("stroke-width", (group) => {
        if (hasFocus && isFocusedCountry(group.name, focusSet)) {
          return 3.6;
        }
        if (group.name === "World") {
          return 3.4;
        }
        return hasFocus ? 2.2 : 2.6;
      })
      .attr("opacity", (group) => (hasFocus && !isFocusedCountry(group.name, focusSet) ? 0.22 : 1))
      .attr("d", (group) => line(group.values));

    paths.each(function () {
      const length = this.getTotalLength();
      d3.select(this)
        .attr("stroke-dasharray", `${length} ${length}`)
        .attr("stroke-dashoffset", length)
        .transition()
        .duration(options.lineDuration || 900)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    });

    frame.plot
      .append("g")
      .selectAll("circle")
      .data(series.map((group) => ({ name: group.name, value: latestValue(group.values) })))
      .join("circle")
      .attr("class", "latest-dot")
      .attr("cx", (item) => x(item.value.year))
      .attr("cy", (item) => y(item.value[metricInfo.key]))
      .attr("r", 0)
      .attr("fill", (item) => colorFor(item.name))
      .attr("opacity", (item) => (hasFocus && !isFocusedCountry(item.name, focusSet) ? 0.22 : 1))
      .transition()
      .delay(600)
      .duration(260)
      .attr("r", 4.5);

    return { metricInfo, series, x, y };
  }

  function plotPointToClient(svgNode, plotX, plotY) {
    if (!svgNode || !svgNode.createSVGPoint || !svgNode.getScreenCTM) {
      return null;
    }

    const matrix = svgNode.getScreenCTM();
    if (!matrix) {
      return null;
    }

    const point = svgNode.createSVGPoint();
    point.x = config.margin.left + plotX;
    point.y = config.margin.top + plotY;
    const screenPoint = point.matrixTransform(matrix);
    return { x: screenPoint.x, y: screenPoint.y };
  }

  function addTooltipOverlay(context, frame, layer) {
    if (!layer) {
      return;
    }

    const { metricInfo, series, x, y } = layer;
    const svgNode = frame.plot.node().ownerSVGElement;
    const hoverMarker = frame.plot
      .append("circle")
      .attr("class", "hover-marker")
      .attr("r", 0)
      .attr("fill", "#fffaf2")
      .attr("fill-opacity", 0.92)
      .attr("stroke-width", 2.5)
      .style("pointer-events", "none");

    function applyDefaultFocus() {
      const focusCountry = context.state.extraCountry;
      frame.plot.selectAll(".line-path").each(function (group) {
        const path = d3.select(this);
        const focused = focusCountry && group.name === focusCountry;
        path
          .classed("is-focused", focused)
          .classed("is-muted", Boolean(focusCountry && group.name !== focusCountry))
          .attr("stroke-width", focused ? 4.2 : group.name === "World" ? 3.4 : 2.6)
          .attr("opacity", focusCountry && group.name !== focusCountry ? 0.28 : 1);
      });
    }

    function setFocusedCountry(name) {
      frame.plot.selectAll(".line-path").each(function (group) {
        const path = d3.select(this);
        const focused = group.name === name;
        path
          .classed("is-focused", focused)
          .classed("is-muted", !focused)
          .attr("stroke-width", focused ? 4.2 : group.name === "World" ? 3.4 : 2.6)
          .attr("opacity", focused ? 1 : 0.28);
      });
    }

    frame.plot
      .append("rect")
      .attr("class", "plot-overlay")
      .attr("width", frame.innerWidth)
      .attr("height", frame.innerHeight)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .raise()
      .on("mousemove", function (event) {
        const [mouseX, mouseY] = d3.pointer(event);
        const year = Math.round(x.invert(mouseX));
        let nearestSeries = null;
        let nearestDistance = Infinity;

        series.forEach((group) => {
          const point = nearestYear(group.values, year);
          const pointX = x(point.year);
          const pointY = y(point[metricInfo.key]);
          const distance = Math.abs(pointY - mouseY);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestSeries = { group, point, pointX, pointY };
          }
        });

        if (!context.state.hasInteracted) {
          context.state.hasInteracted = true;
          frame.plot
            .selectAll(".annotation-group")
            .transition()
            .duration(220)
            .style("opacity", 0)
            .remove();
        }

        if (!nearestSeries) {
          hoverMarker.attr("r", 0);
          applyDefaultFocus();
          context.hideTooltip();
          return;
        }

        const accent = colorFor(nearestSeries.group.name);
        hoverMarker
          .attr("cx", nearestSeries.pointX)
          .attr("cy", nearestSeries.pointY)
          .attr("r", 6.5)
          .attr("stroke", accent);

        setFocusedCountry(nearestSeries.group.name);
        const anchor =
          plotPointToClient(svgNode, nearestSeries.pointX, nearestSeries.pointY) ||
          { x: event.clientX, y: event.clientY };
        context.showTooltip(anchor, {
          title: nearestSeries.group.name,
          color: accent,
          rows: [
            `${nearestSeries.point.year}`,
            `${metricInfo.tooltipFormat(nearestSeries.point[metricInfo.key])}`
          ]
        });
      })
      .on("mouseleave", () => {
        hoverMarker.attr("r", 0);
        applyDefaultFocus();
        context.hideTooltip();
      });
  }

  function drawLegend(frame, series) {
    const legend = frame.root
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${config.width - config.margin.right + 28},${config.margin.top + 8})`);

    const item = legend
      .selectAll("g")
      .data(series)
      .join("g")
      .attr("transform", (_group, index) => `translate(0,${index * 26})`);

    item
      .append("line")
      .attr("x1", 0)
      .attr("x2", 22)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", (group) => colorFor(group.name))
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round");

    item
      .append("text")
      .attr("x", 30)
      .attr("y", 4)
      .text((group) => group.name);
  }

  function addAnnotations(frame, annotations) {
    if (!d3.annotation || !annotations.length) {
      return;
    }

    const makeAnnotations = d3
      .annotation()
      .type(d3.annotationCalloutCircle)
      .notePadding(16)
      .annotations(annotations);

    frame.plot.append("g").attr("class", "annotation-group").call(makeAnnotations).raise();

    frame.plot.selectAll(".annotation-note").each(function () {
      const note = d3.select(this);
      const rect = note.select(".annotation-note-bg");
      const content = note.select(".annotation-note-content");
      const pad = 8;
      const x = Number(rect.attr("x") || 0);
      const y = Number(rect.attr("y") || 0);
      const width = Number(rect.attr("width"));
      const height = Number(rect.attr("height"));

      rect
        .attr("x", x - pad)
        .attr("y", y - pad)
        .attr("width", width + pad * 2)
        .attr("height", height + pad * 2)
        .attr("fill", "#fffaf2")
        .attr("fill-opacity", 1)
        .attr("rx", 12)
        .attr("ry", 12);

      const transform = content.attr("transform") || "";
      content.attr("transform", `${transform} translate(${pad}, ${pad})`.trim());
    });

    frame.plot.selectAll(".annotation-subject .subject").attr("stroke-width", 2);

    nudgeAnnotationsIntoPlot(frame);
    nudgeAnnotationsIntoPlot(frame);
  }

  function nudgeAnnotationsIntoPlot(frame) {
    const padding = 14;
    const svgNode = frame.plot.node().ownerSVGElement;
    if (!svgNode) {
      return;
    }
    const svgRect = svgNode.getBoundingClientRect();
    const scaleX = svgRect.width / config.width;
    const scaleY = svgRect.height / config.height;
    const plotLeft = svgRect.left + config.margin.left * scaleX;
    const plotTop = svgRect.top + config.margin.top * scaleY;
    const plotRight = svgRect.left + (config.margin.left + frame.innerWidth) * scaleX;
    const plotBottom = svgRect.top + (config.margin.top + frame.innerHeight) * scaleY;

    frame.plot.selectAll("g.annotation").each(function () {
      const annotation = d3.select(this);
      const background = annotation.select(".annotation-note-bg").node();
      if (!background) {
        return;
      }

      const noteRect = background.getBoundingClientRect();
      let shiftX = 0;
      let shiftY = 0;

      if (noteRect.left < plotLeft + padding) {
        shiftX += plotLeft + padding - noteRect.left;
      }
      if (noteRect.top < plotTop + padding) {
        shiftY += plotTop + padding - noteRect.top;
      }
      if (noteRect.right > plotRight - padding) {
        shiftX -= noteRect.right - (plotRight - padding);
      }
      if (noteRect.bottom > plotBottom - padding) {
        shiftY -= noteRect.bottom - (plotBottom - padding);
      }

      if (!shiftX && !shiftY) {
        return;
      }

      const note = annotation.select(".annotation-note");
      const noteTransform = note.attr("transform") || "";
      const match = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(noteTransform);
      const noteX = match ? Number(match[1]) : 0;
      const noteY = match ? Number(match[2]) : 0;

      note.attr(
        "transform",
        `translate(${noteX + shiftX / scaleX}, ${noteY + shiftY / scaleY})`
      );
    });
  }

  function drawLineChart(context, options) {
    const metricInfo = getMetric(options.metric);
    const frame = setupFrame(context);
    const xDomain = options.xDomain || [
      d3.min(options.series, (group) => d3.min(group.values, (row) => row.year)),
      d3.max(options.series, (group) => d3.max(group.values, (row) => row.year))
    ];
    const yMax = options.yMax || maxSeriesValue(options.series, metricInfo.key);

    const x = d3.scaleLinear().domain(xDomain).range([0, frame.innerWidth]);
    const y = d3.scaleLinear().domain([0, yMax * 1.1]).nice().range([frame.innerHeight, 0]);

    drawAxes(frame, x, y, metricInfo, { hasBrush: Boolean(options.brush) });
    const layer = drawLines(context, frame, options.series, x, y, metricInfo, options);
    drawLegend(frame, options.series);

    const annotations = (options.annotations || []).map((annotation) => {
      return {
        ...annotation,
        x: x(annotation.year),
        y: y(annotation.value)
      };
    });
    addAnnotations(frame, annotations);

    if (options.tooltip) {
      addTooltipOverlay(context, frame, layer);
    }

    if (options.brush) {
      addBrush(context, frame, x);
    }
  }

  function addBrush(context, frame, x) {
    const brushHeight = 24;
    const brushTop = frame.innerHeight + 48;
    const brush = d3
      .brushX()
      .extent([
        [0, brushTop],
        [frame.innerWidth, brushTop + brushHeight]
      ])
      .on("end", (event) => {
        if (!event.sourceEvent) {
          return;
        }

        if (!event.selection) {
          context.state.hasInteracted = true;
          context.state.yearRange = [...context.fullYearRange];
          context.render();
          return;
        }

        const years = event.selection.map(x.invert).map(Math.round).sort(d3.ascending);
        if (years[1] - years[0] < 3) {
          brushGroup.call(brush.move, null);
          return;
        }

        context.state.hasInteracted = true;
        context.state.yearRange = years;
        context.render();
      });

    const brushGroup = frame.plot.append("g").attr("class", "brush").call(brush);
    const [minYear, maxYear] = context.state.yearRange;
    const fullRange = context.fullYearRange;
    const isPartial =
      minYear > fullRange[0] + 1 || maxYear < fullRange[1] - 1;

    if (isPartial) {
      brushGroup.call(brush.move, [x(minYear), x(maxYear)]);
    }

    return brushGroup;
  }

  function renderSceneOne(state, context) {
    const worldSeries = buildSeries(context.data, ["World"], "co2", context.fullYearRange);
    const values = worldSeries[0].values;
    const point1850 = nearestYear(values, 1850);
    const point1950 = nearestYear(values, 1950);

    drawLineChart(context, {
      metric: "co2",
      series: worldSeries,
      xDomain: context.fullYearRange,
      annotations: [
        {
          year: point1850.year,
          value: point1850.co2,
          dx: 82,
          dy: -42,
          subject: { radius: 7 },
          note: {
            title: "Low starting point",
            label: "In 1850, annual emissions were tiny compared with today's global scale.",
            wrap: 180
          }
        },
        {
          year: point1950.year,
          value: point1950.co2,
          dx: -188,
          dy: -118,
          subject: { radius: 8 },
          note: {
            title: "Post-1950 acceleration",
            label: "Industrial expansion, energy demand, and population growth bend the curve upward.",
            wrap: 190
          }
        }
      ]
    });
  }

  function renderSceneTwo(state, context) {
    const yearRange = [1900, context.fullYearRange[1]];
    const series = buildSeries(context.data, context.topCountries, "co2", yearRange);
    const crossover = findChinaUsCrossover(context.data);

    drawLineChart(context, {
      metric: "co2",
      series,
      xDomain: yearRange,
      curve: d3.curveLinear,
      annotations: [
        {
          year: crossover.year,
          value: crossover.value,
          dx: -160,
          dy: -76,
          subject: { radius: 7, stroke: "#c2410c", fill: "#fffaf2", fillOpacity: 0.95 },
          note: {
            title: "A leadership shift",
            label: `China overtakes the United States in annual emissions around ${crossover.labelYear}.`,
            wrap: 185
          }
        }
      ]
    });
  }

  function renderSceneThree(state, context) {
    const yearRange = [1900, context.fullYearRange[1]];
    const series = buildSeries(context.data, context.topCountries, "co2_per_capita", yearRange);
    const us = series.find((group) => group.name === "United States");
    const india = series.find((group) => group.name === "India");
    const annotations = [];

    if (us?.values?.length) {
      const usPoint = nearestYear(us.values, 1985);
      annotations.push({
        year: usPoint.year,
        value: usPoint.co2_per_capita,
        dx: -205,
        dy: -38,
        subject: { radius: 7, stroke: "#2563eb", fill: "#fffaf2", fillOpacity: 0.95 },
        note: {
          title: "High per-person footprint",
          label: "The United States remains much higher per person than the biggest emerging emitters.",
          wrap: 160
        }
      });
    }

    if (india?.values?.length) {
      const indiaPoint = nearestYear(india.values, 2012);
      annotations.push({
        year: indiaPoint.year,
        value: indiaPoint.co2_per_capita,
        dx: -176,
        dy: -98,
        subject: { radius: 7, stroke: "#16a34a", fill: "#fffaf2", fillOpacity: 0.95 },
        note: {
          title: "Scale is not the same as intensity",
          label: "India is a major total emitter, but its per-capita emissions stay comparatively low.",
          wrap: 160
        }
      });
    }

    drawLineChart(context, {
      metric: "co2_per_capita",
      series,
      xDomain: yearRange,
      focusCountries: ["United States", "India"],
      annotations
    });
  }

  function renderExploreScene(state, context) {
    const metric = state.metric;
    const selectedCountries = state.selectedCountries.length ? state.selectedCountries : context.topCountries;
    const extraCountry = state.extraCountry || "";
    const series = buildSeries(context.data, selectedCountries, metric, state.yearRange);
    const metricInfo = getMetric(metric);

    const isFullYearRange =
      state.yearRange[0] === context.fullYearRange[0] && state.yearRange[1] === context.fullYearRange[1];

    let welcomeAnnotations = [];
    if (!state.hasInteracted && !extraCountry && isFullYearRange && series.length) {
      const highest = series
        .map((group) => ({ name: group.name, value: latestValue(group.values) }))
        .sort((a, b) => d3.descending(a.value[metricInfo.key], b.value[metricInfo.key]))[0];
      if (highest && highest.value) {
        welcomeAnnotations = [
          {
            year: highest.value.year,
            value: highest.value[metricInfo.key],
            dx: -268,
            dy: -52,
            subject: { radius: 7, stroke: colorFor(highest.name), fill: "#fffaf2", fillOpacity: 0.95 },
            note: {
              title: "Start exploring",
              label:
                "Hover any line for exact values. Add a country above, or brush the timeline below to narrow the years.",
              wrap: 215
            }
          }
        ];
      }
    }

    drawLineChart(context, {
      metric,
      series,
      xDomain: state.yearRange,
      focusCountry: extraCountry || null,
      annotations: welcomeAnnotations,
      tooltip: true,
      brush: true,
      lineDuration: 520
    });
  }

  function renderNarrativeScene(state, context) {
    if (state.sceneIndex === 0) {
      renderSceneOne(state, context);
    } else if (state.sceneIndex === 1) {
      renderSceneTwo(state, context);
    } else if (state.sceneIndex === 2) {
      renderSceneThree(state, context);
    } else {
      renderExploreScene(state, context);
    }
  }

  window.NarrativeScenes = {
    sceneCount: sceneCopy.length,
    getSceneCopy,
    renderNarrativeScene,
    getMetric
  };
})();
