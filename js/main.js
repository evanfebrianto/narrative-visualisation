(function () {
  const topCountries = ["China", "United States", "India", "Russia", "Japan"];

  const state = {
    sceneIndex: 0,
    selectedCountries: [...topCountries],
    metric: "co2",
    yearRange: [1850, 2023]
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
    render();
  });

  elements.nextButton.addEventListener("click", () => {
    state.sceneIndex = Math.min(window.NarrativeScenes.sceneCount - 1, state.sceneIndex + 1);
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
      selectedCountries: [...state.selectedCountries]
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

    const extraCountry = state.selectedCountries.find((country) => !topCountries.includes(country)) || "";
    elements.controls.classList.remove("is-hidden");
    elements.controls.innerHTML = `
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
      <button class="reset-button" type="button" id="reset-years">Reset years</button>
    `;

    elements.controls.querySelector("#country-select").addEventListener("change", (event) => {
      const country = event.target.value;
      state.selectedCountries = country ? Array.from(new Set([...topCountries, country])) : [...topCountries];
      render();
    });

    elements.controls.querySelectorAll("[data-metric]").forEach((button) => {
      button.addEventListener("click", () => {
        state.metric = button.dataset.metric;
        render();
      });
    });

    elements.controls.querySelector("#reset-years").addEventListener("click", () => {
      state.yearRange = [...context.fullYearRange];
      render();
    });
  }

  function showTooltip(event, content) {
    const rows = content.rows.map((row) => `<span>${escapeHtml(row)}</span>`).join("<br>");
    elements.tooltip
      .classed("is-hidden", false)
      .html(`<strong>${escapeHtml(content.title)}</strong>${rows}`)
      .style("left", `${event.clientX + 14}px`)
      .style("top", `${event.clientY + 14}px`);
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
