(function () {
  const topCountries = ["China", "United States", "India", "Russia", "Japan"];

  const state = {
    sceneIndex: 0,
    selectedCountries: [...topCountries],
    extraCountry: "",
    metric: "co2",
    yearRange: [1850, 2023],
    hasInteracted: false
  };

  const elements = {
    svg: d3.select("#chart"),
    tooltip: d3.select("#tooltip"),
    controls: document.querySelector("#controls"),
    sceneKicker: document.querySelector("#scene-kicker"),
    sceneTitle: document.querySelector("#scene-title"),
    sceneSummary: document.querySelector("#scene-summary"),
    progressFill: document.querySelector("#progress-fill"),
    prevButton: document.querySelector("#prev-scene"),
    nextButton: document.querySelector("#next-scene")
  };

  const context = {
    data: [],
    countryNames: [],
    topCountries,
    fullYearRange: [...state.yearRange],
    state,
    svg: elements.svg,
    render,
    showTooltip,
    hideTooltip
  };

  elements.prevButton.addEventListener("click", () => {
    state.sceneIndex = Math.max(0, state.sceneIndex - 1);
    state.hasInteracted = false;
    render();
  });

  elements.nextButton.addEventListener("click", () => {
    state.sceneIndex = Math.min(window.NarrativeScenes.sceneCount - 1, state.sceneIndex + 1);
    state.hasInteracted = false;
    render();
  });

  d3.csv("data/co2.csv", parseRow)
    .then((rows) => {
      context.data = rows;
      context.fullYearRange = d3.extent(
        rows.filter((row) => row.country === "World" && Number.isFinite(row.co2)),
        (row) => row.year
      );
      state.yearRange = [...context.fullYearRange];
      context.countryNames = Array.from(
        new Set(
          rows
            .filter((row) => row.country !== "World" && (Number.isFinite(row.co2) || Number.isFinite(row.co2_per_capita)))
            .map((row) => row.country)
        )
      ).sort(d3.ascending);
      render();
    })
    .catch((error) => {
      elements.sceneTitle.textContent = "Unable to load CO2 data";
      elements.sceneSummary.textContent = error.message;
    });

  function parseRow(row) {
    return {
      country: row.country,
      iso_code: row.iso_code,
      year: Number(row.year),
      co2: parseNullableNumber(row.co2),
      co2_per_capita: parseNullableNumber(row.co2_per_capita),
      population: parseNullableNumber(row.population)
    };
  }

  function parseNullableNumber(value) {
    if (value === "" || value === undefined || value === null) {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function render() {
    window.__narrativeState = {
      sceneIndex: state.sceneIndex,
      metric: state.metric,
      yearRange: [...state.yearRange],
      fullYearRange: [...context.fullYearRange],
      selectedCountries: [...state.selectedCountries],
      extraCountry: state.extraCountry,
      hasInteracted: state.hasInteracted
    };

    const scene = window.NarrativeScenes.getSceneCopy(state.sceneIndex);
    elements.sceneKicker.textContent = scene.kicker;
    elements.sceneTitle.textContent = scene.title;
    elements.sceneSummary.textContent = scene.summary;
    elements.progressFill.style.width = `${((state.sceneIndex + 1) / window.NarrativeScenes.sceneCount) * 100}%`;

    elements.prevButton.disabled = state.sceneIndex === 0;
    elements.nextButton.disabled = state.sceneIndex === window.NarrativeScenes.sceneCount - 1;
    elements.nextButton.textContent = state.sceneIndex === window.NarrativeScenes.sceneCount - 2 ? "Explore" : "Next";

    hideTooltip();
    renderControls();
    window.NarrativeScenes.renderNarrativeScene(state, context);
  }

  function renderControls() {
    if (state.sceneIndex !== window.NarrativeScenes.sceneCount - 1) {
      elements.controls.classList.add("is-hidden");
      elements.controls.innerHTML = "";
      return;
    }

    const extraCountry = state.extraCountry || "";
    const [startYear, endYear] = state.yearRange;
    const [fullStart, fullEnd] = context.fullYearRange;
    const yearOptions = d3.range(fullStart, fullEnd + 1);
    elements.controls.classList.remove("is-hidden");
    const comparisonNote = buildComparisonNote(extraCountry);
    elements.controls.innerHTML = `
      <p class="explore-hint">Hover the chart for exact values. Add a country, switch the metric, or set a year range with the dropdowns or the timeline bar under the chart.</p>
      <div class="controls-row">
        <div class="control-group">
          <label class="control-label" for="country-select">Add a comparison country</label>
          <select id="country-select">
            <option value="">Top five only</option>
            ${context.countryNames
              .filter((country) => !topCountries.includes(country))
              .map((country) => `<option value="${escapeHtml(country)}"${country === extraCountry ? " selected" : ""}>${escapeHtml(country)}</option>`)
              .join("")}
          </select>
        </div>
        <div class="control-group">
          <p class="control-label">Metric</p>
          <div class="metric-toggle" role="group" aria-label="Metric">
            <button type="button" data-metric="co2" class="${state.metric === "co2" ? "is-active" : ""}">Total emissions</button>
            <button type="button" data-metric="co2_per_capita" class="${state.metric === "co2_per_capita" ? "is-active" : ""}">Per capita</button>
          </div>
        </div>
      </div>
      <div class="controls-row year-controls-row">
        <div class="control-group">
          <label class="control-label" for="year-start">Start year</label>
          <select id="year-start">
            ${yearOptions
              .map((year) => `<option value="${year}"${year === startYear ? " selected" : ""}>${year}</option>`)
              .join("")}
          </select>
        </div>
        <div class="control-group">
          <label class="control-label" for="year-end">End year</label>
          <select id="year-end">
            ${yearOptions
              .map((year) => `<option value="${year}"${year === endYear ? " selected" : ""}>${year}</option>`)
              .join("")}
          </select>
        </div>
        <button class="reset-button" type="button" id="reset-years">Reset years</button>
      </div>
      <p class="year-range-label">Showing ${startYear} to ${endYear}</p>
      ${comparisonNote ? `<p id="comparison-note" class="comparison-note">${comparisonNote}</p>` : ""}
    `;

    elements.controls.querySelector("#country-select").addEventListener("change", (event) => {
      const country = event.target.value;
      state.extraCountry = country;
      state.selectedCountries = country ? Array.from(new Set([...topCountries, country])) : [...topCountries];
      state.hasInteracted = true;
      render();
    });

    elements.controls.querySelectorAll("[data-metric]").forEach((button) => {
      button.addEventListener("click", () => {
        state.metric = button.dataset.metric;
        state.hasInteracted = true;
        render();
      });
    });

    const applyYearRange = () => {
      const nextStart = Number(elements.controls.querySelector("#year-start").value);
      const nextEnd = Number(elements.controls.querySelector("#year-end").value);
      if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd) || nextEnd - nextStart < 3) {
        elements.controls.querySelector("#year-start").value = String(state.yearRange[0]);
        elements.controls.querySelector("#year-end").value = String(state.yearRange[1]);
        return;
      }
      state.yearRange = [Math.min(nextStart, nextEnd), Math.max(nextStart, nextEnd)];
      state.hasInteracted = true;
      render();
    };

    elements.controls.querySelector("#year-start").addEventListener("change", applyYearRange);
    elements.controls.querySelector("#year-end").addEventListener("change", applyYearRange);

    elements.controls.querySelector("#reset-years").addEventListener("click", () => {
      state.yearRange = [...context.fullYearRange];
      state.hasInteracted = true;
      render();
    });
  }

  function buildComparisonNote(extraCountry) {
    if (!extraCountry) {
      return "";
    }

    const metricInfo = window.NarrativeScenes.getMetric(state.metric);
    const latestYear = state.yearRange[1];
    const extraValues = context.data.filter(
      (row) => row.country === extraCountry && Number.isFinite(row[metricInfo.key]) && row.year <= latestYear
    );
    const topValues = topCountries.flatMap((country) =>
      context.data.filter(
        (row) => row.country === country && Number.isFinite(row[metricInfo.key]) && row.year <= latestYear
      )
    );

    if (!extraValues.length || !topValues.length) {
      return `${escapeHtml(extraCountry)} is highlighted for comparison.`;
    }

    const extraLatest = extraValues.sort((a, b) => b.year - a.year)[0][metricInfo.key];
    const topLatest = d3.max(topValues, (row) => row[metricInfo.key]);
    const ratio = topLatest / Math.max(extraLatest, 0.001);

    if (state.metric === "co2" && ratio >= 25) {
      return `<strong>${escapeHtml(extraCountry)}</strong> is highlighted, but its total emissions are far smaller than the top five on this linear scale. The line runs near the bottom - switch to <strong>Per capita</strong> for a fairer comparison.`;
    }

    if (state.metric === "co2" && ratio >= 8) {
      return `<strong>${escapeHtml(extraCountry)}</strong> is highlighted for comparison. Its total emissions are smaller than the largest emitters, so the line may sit lower on the chart.`;
    }

    return `<strong>${escapeHtml(extraCountry)}</strong> is highlighted for comparison.`;
  }

  function showTooltip(anchor, content) {
    const rows = content.rows.map((row) => `<span>${escapeHtml(row)}</span>`).join("<br>");
    const tooltipWidth = 230;
    const tooltipHeight = 90;
    const offset = 14;
    let left = anchor.x + offset;
    let top = anchor.y - tooltipHeight / 2;

    if (left + tooltipWidth > window.innerWidth - 12) {
      left = anchor.x - tooltipWidth - offset;
    }
    if (left < 12) {
      left = 12;
    }
    if (top < 12) {
      top = anchor.y + offset;
    }
    if (top + tooltipHeight > window.innerHeight - 12) {
      top = anchor.y - tooltipHeight - offset;
    }

    elements.tooltip
      .classed("is-hidden", false)
      .style("--tooltip-accent", content.color || "#b45309")
      .html(`<strong>${escapeHtml(content.title)}</strong>${rows}`)
      .style("left", `${left}px`)
      .style("top", `${top}px`);
  }

  function hideTooltip() {
    elements.tooltip.classed("is-hidden", true);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
