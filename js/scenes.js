(function () {
  const config = {
    width: 960,
    height: 560,
    margin: { top: 42, right: 164, bottom: 86, left: 82 },
    colors: {
      World: "#1f2933",
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
      axisFormat: (value) => (value >= 1000 ? `${d3.format(".0f")(value / 1000)} Gt` : d3.format(".0f")(value)),
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
    const china = new Map(cleanValues(data, "China", "co2", [1900, 2100]).map((row) => [row.year, row.co2]));
    const us = new Map(cleanValues(data, "United States", "co2", [1900, 2100]).map((row) => [row.year, row.co2]));

    for (let year = 2000; year <= 2025; year += 1) {
      if (china.has(year) && us.has(year) && china.get(year) > us.get(year)) {
        return { year, value: china.get(year) };
      }
    }

    return { year: 2006, value: china.get(2006) || 6000 };
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

  function drawAxes(frame, x, y, metricInfo) {
    const xAxis = d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8);
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
      .attr("y", frame.innerHeight + 48)
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

  function drawLines(context, frame, series, x, y, metricInfo, options) {
    const line = d3
      .line()
      .defined((row) => Number.isFinite(row[metricInfo.key]))
      .x((row) => x(row.year))
      .y((row) => y(row[metricInfo.key]))
      .curve(d3.curveMonotoneX);

    const paths = frame.plot
      .append("g")
      .attr("class", "series-layer")
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("class", "line-path")
      .attr("stroke", (group) => colorFor(group.name))
      .attr("stroke-width", (group) => (group.name === "World" ? 3.4 : 2.6))
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

    if (options.tooltip) {
      paths
        .attr("stroke-width", 4)
        .style("cursor", "pointer")
        .on("mousemove", function (event, group) {
          const [mouseX] = d3.pointer(event, frame.plot.node());
          const year = Math.round(x.invert(mouseX));
          const point = nearestYear(group.values, year);
          context.showTooltip(event, {
            title: group.name,
            rows: [`${point.year}`, `${metricInfo.tooltipFormat(point[metricInfo.key])}`]
          });
        })
        .on("mouseleave", context.hideTooltip);
    }

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
      .transition()
      .delay(600)
      .duration(260)
      .attr("r", 4.5);
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
      .annotations(annotations);

    frame.plot.append("g").attr("class", "annotation-group").call(makeAnnotations);
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

    drawAxes(frame, x, y, metricInfo);
    drawLines(context, frame, options.series, x, y, metricInfo, options);
    drawLegend(frame, options.series);

    const annotations = (options.annotations || []).map((annotation) => {
      return {
        ...annotation,
        x: x(annotation.year),
        y: y(annotation.value)
      };
    });
    addAnnotations(frame, annotations);

    if (options.brush) {
      addBrush(context, frame, x);
    }
  }

  function addBrush(context, frame, x) {
    const brushY = frame.innerHeight + 58;
    const brush = d3
      .brushX()
      .extent([
        [0, frame.innerHeight + 28],
        [frame.innerWidth, brushY]
      ])
      .on("end", (event) => {
        if (!event.selection) {
          return;
        }

        const years = event.selection.map(x.invert).map(Math.round).sort(d3.ascending);
        if (years[1] - years[0] < 3) {
          return;
        }

        context.state.yearRange = years;
        context.render();
      });

    frame.plot
      .append("text")
      .attr("class", "brush-hint")
      .attr("x", 0)
      .attr("y", frame.innerHeight + 22)
      .text("Brush the timeline below to narrow the year range.");

    frame.plot.append("g").attr("class", "brush").call(brush);
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
          dx: 78,
          dy: -96,
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
      annotations: [
        {
          year: crossover.year,
          value: crossover.value,
          dx: -160,
          dy: -76,
          subject: { radius: 8 },
          note: {
            title: "A leadership shift",
            label: `China overtakes the United States in annual emissions around ${crossover.year}.`,
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
    const usPoint = nearestYear(us.values, 2005);
    const indiaPoint = nearestYear(india.values, 2005);

    drawLineChart(context, {
      metric: "co2_per_capita",
      series,
      xDomain: yearRange,
      annotations: [
        {
          year: usPoint.year,
          value: usPoint.co2_per_capita,
          dx: -150,
          dy: -58,
          subject: { radius: 8 },
          note: {
            title: "High per-person footprint",
            label: "The United States remains much higher per person than the biggest emerging emitters.",
            wrap: 190
          }
        },
        {
          year: indiaPoint.year,
          value: indiaPoint.co2_per_capita,
          dx: 74,
          dy: -70,
          subject: { radius: 7 },
          note: {
            title: "Scale is not the same as intensity",
            label: "India is a major total emitter, but its per-capita emissions stay comparatively low.",
            wrap: 190
          }
        }
      ]
    });
  }

  function renderExploreScene(state, context) {
    const metric = state.metric;
    const selectedCountries = state.selectedCountries.length ? state.selectedCountries : context.topCountries;
    const series = buildSeries(context.data, selectedCountries, metric, state.yearRange);
    const metricInfo = getMetric(metric);
    const highestLatest = series
      .map((group) => ({ name: group.name, value: latestValue(group.values) }))
      .sort((a, b) => d3.descending(a.value[metricInfo.key], b.value[metricInfo.key]))[0];

    const annotations = highestLatest
      ? [
          {
            year: highestLatest.value.year,
            value: highestLatest.value[metricInfo.key],
            dx: -142,
            dy: -66,
            subject: { radius: 8 },
            note: {
              title: "Your comparison point",
              label: `Hover over any line to inspect exact ${metricInfo.shortLabel.toLowerCase()} values by year.`,
              wrap: 190
            }
          }
        ]
      : [];

    drawLineChart(context, {
      metric,
      series,
      xDomain: state.yearRange,
      annotations,
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
