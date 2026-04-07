(function () {
  const data = window.DEMO_DATA;
  if (!data || !Array.isArray(data.samples) || !data.samples.length) {
    throw new Error("DEMO_DATA is missing or invalid.");
  }

  const sampleTabsEl = document.getElementById("sample-tabs");
  const targetTabsEl = document.getElementById("target-tabs");
  const caseSummaryEl = document.getElementById("case-summary");
  const referenceAudioEl = document.getElementById("reference-audio");
  const metricStripEl = document.getElementById("metric-strip");
  const resultPanelEl = document.getElementById("result-panel");
  const subsetGridEl = document.getElementById("subset-grid");

  const MODALITY_ORDER = ["visual", "text", "pre-enrollment", "spatial"];
  const MODALITY_LABELS = {
    visual: "visual",
    text: "text",
    "pre-enrollment": "pre-enrollment",
    spatial: "spatial",
  };
  const MODALITY_MAP = {
    av: "visual",
    text: "text",
    pre: "pre-enrollment",
    main: "spatial",
    visual: "visual",
    spatial: "spatial",
  };
  const SUBSET_FALLBACK = normalizeSubsets(data.samples[0].subsets);

  let sampleIndex = 0;
  let targetIndex = 0;
  let selectedSubsetKey = "";

  function normalizeModalities(modalities) {
    return modalities
      .map((modality) => MODALITY_MAP[modality] || modality)
      .sort((a, b) => MODALITY_ORDER.indexOf(a) - MODALITY_ORDER.indexOf(b));
  }

  function normalizeSubsets(subsets) {
    return subsets.map((subset) => {
      const modalities = normalizeModalities(subset.modalities || []);
      return {
        ...subset,
        modalities,
        canonicalKey: modalities.join(" + "),
      };
    });
  }

  function getCurrentSample() {
    const sample = data.samples[sampleIndex];
    const subsets = sample.subsets && sample.subsets.length
      ? normalizeSubsets(sample.subsets)
      : SUBSET_FALLBACK;

    return {
      ...sample,
      subsets,
    };
  }

  function getCurrentTarget(sample) {
    return sample.targetProfiles[targetIndex];
  }

  function getSelectedSubset(sample) {
    const found = sample.subsets.find((subset) => subset.key === selectedSubsetKey);
    return found || sample.subsets[0];
  }

  function createAudioBlock(item) {
    const wrapper = document.createElement("div");
    wrapper.className = "audio-block";

    const title = document.createElement("h3");
    title.textContent = item.label;

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";

    const source = document.createElement("source");
    if (item.available) {
      source.src = item.path;
    }
    source.type = "audio/wav";
    audio.appendChild(source);

    const hint = document.createElement("p");
    hint.textContent = item.available ? item.path : `Placeholder path: ${item.path}`;

    wrapper.append(title, audio, hint);
    return wrapper;
  }

  function createInlineAudio(item, compact) {
    const wrapper = document.createElement("div");
    wrapper.className = compact ? "inline-audio compact" : "inline-audio";

    const label = document.createElement("span");
    label.className = "inline-audio-label";
    label.textContent = item.label;

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.addEventListener("click", (event) => event.stopPropagation());
    audio.addEventListener("pointerdown", (event) => event.stopPropagation());

    const source = document.createElement("source");
    if (item.available) {
      source.src = item.path;
    }
    source.type = "audio/wav";
    audio.appendChild(source);

    wrapper.append(label, audio);
    return wrapper;
  }

  function sortSubsets(subsets) {
    return [...subsets].sort((a, b) => {
      if (a.modalities.length !== b.modalities.length) {
        return a.modalities.length - b.modalities.length;
      }
      return a.canonicalKey.localeCompare(b.canonicalKey);
    });
  }

  function renderSampleTabs() {
    sampleTabsEl.innerHTML = "";
    data.samples.forEach((sample, index) => {
      const button = document.createElement("button");
      button.className = `sample-tab${index === sampleIndex ? " active" : ""}`;
      button.type = "button";
      button.innerHTML = `<strong>${sample.label}</strong><span>${sample.title}</span>`;
      button.addEventListener("click", () => {
        sampleIndex = index;
        targetIndex = 0;
        selectedSubsetKey = "";
        render();
      });
      sampleTabsEl.appendChild(button);
    });
  }

  function renderTargetTabs(sample) {
    targetTabsEl.innerHTML = "";
    sample.targetProfiles.forEach((target, index) => {
      const button = document.createElement("button");
      button.className = `target-tab${index === targetIndex ? " active" : ""}`;
      button.type = "button";
      button.innerHTML = `<strong>${target.label}</strong><span>${target.promptSummary}</span>`;
      button.addEventListener("click", () => {
        targetIndex = index;
        render();
      });
      targetTabsEl.appendChild(button);
    });
  }

  function renderSummary(sample, target) {
    caseSummaryEl.innerHTML = "";

    const scene = document.createElement("div");
    scene.className = "summary-note";
    scene.textContent = sample.scene;
    caseSummaryEl.appendChild(scene);

    sample.notes.forEach((note) => {
      const item = document.createElement("div");
      item.className = "summary-note";
      item.textContent = note;
      caseSummaryEl.appendChild(item);
    });

    const targetNote = document.createElement("div");
    targetNote.className = "summary-note emphasis";
    targetNote.textContent = `${target.title}: ${target.promptSummary}`;
    caseSummaryEl.appendChild(targetNote);
  }

  function renderReferenceAudio(sample) {
    referenceAudioEl.innerHTML = "";
    Object.values(sample.references).forEach((item) => {
      referenceAudioEl.appendChild(createAudioBlock(item));
    });
  }

  function renderMetricStrip(sample, target) {
    const scores = sample.subsets.map((subset) => subset.targetScores[target.id]);
    const best = Math.max(...scores);
    const average = scores.reduce((acc, value) => acc + value, 0) / scores.length;
    const fullFusion = sample.subsets.find((subset) => subset.modalities.length === 4);

    metricStripEl.innerHTML = `
      <article class="metric-card">
        <h3>Mixture SI-SNR</h3>
        <strong>${target.baselineMixSiSnr}</strong>
        <p>Selected target difficulty before prompt-guided extraction.</p>
      </article>
      <article class="metric-card">
        <h3>Best SI-SNRi</h3>
        <strong>${best.toFixed(1)} dB</strong>
        <p>Highest score over the 15 prompt combinations.</p>
      </article>
      <article class="metric-card">
        <h3>Average SI-SNRi</h3>
        <strong>${average.toFixed(1)} dB</strong>
        <p>Mean performance across the full matrix.</p>
      </article>
      <article class="metric-card">
        <h3>Full Fusion</h3>
        <strong>${fullFusion.targetScores[target.id].toFixed(1)} dB</strong>
        <p>Reference score when all four prompts are enabled.</p>
      </article>
    `;
  }

  function renderResultPanel(sample, target) {
    const subset = getSelectedSubset(sample);
    const promptTags = MODALITY_ORDER.map((modality) => {
      const active = subset.modalities.includes(modality);
      return `<span class="result-tag${active ? " active" : ""}">${active ? MODALITY_LABELS[modality] : "-"}</span>`;
    }).join("");

    const audioPath = subset.available ? subset.audio[target.id] : `Placeholder path: ${subset.audio[target.id]}`;

    resultPanelEl.innerHTML = `
      <div class="result-copy">
        <p class="block-title">Selected Combination</p>
        <h3>${subset.canonicalKey}</h3>
        <p class="result-note">${subset.note}</p>
        <div class="result-tags">${promptTags}</div>
      </div>
      <div class="result-metrics">
        <div class="meta-box">
          <span>${target.label} SI-SNRi</span>
          <strong>${subset.targetScores[target.id].toFixed(1)} dB</strong>
        </div>
        <div class="meta-box">
          <span>Mean Over Targets</span>
          <strong>${subset.meanSiSnri.toFixed(1)} dB</strong>
        </div>
      </div>
      <div class="result-audio">
        <p class="block-title">Separated Output</p>
        <audio controls preload="none">
          <source src="${subset.available ? subset.audio[target.id] : ""}" type="audio/wav" />
        </audio>
        <p class="placeholder">${audioPath}</p>
      </div>
    `;
  }

  function renderSubsetGrid(sample) {
    const target = getCurrentTarget(sample);
    const subsets = sortSubsets(sample.subsets);
    const mixture = sample.references.mixture;
    const target1 = sample.references.target1;
    const target2 = sample.references.target2;

    if (!selectedSubsetKey) {
      selectedSubsetKey = subsets[0].key;
    }

    subsetGridEl.innerHTML = "";

    const headerLabels = ["Mixed Speech", "Target1", "Target2", "visual", "text", "pre-enrollment", "spatial"];
    headerLabels.forEach((label) => {
      const cell = document.createElement("div");
      cell.className = "matrix-header-cell";
      cell.textContent = label;
      subsetGridEl.appendChild(cell);
    });

    subsets.forEach((subset, index) => {
      const rowClass = subset.key === selectedSubsetKey ? " matrix-row selected" : " matrix-row";

      const cells = [];
      const mixtureCell = document.createElement("div");
      mixtureCell.className = `${rowClass} matrix-audio-cell`;
      mixtureCell.appendChild(createInlineAudio({ ...mixture, label: `Row ${index + 1} · Mixture` }, true));
      mixtureCell.addEventListener("click", () => {
        selectedSubsetKey = subset.key;
        render();
      });
      cells.push(mixtureCell);

      const target1Cell = document.createElement("div");
      target1Cell.className = `${rowClass} matrix-audio-cell`;
      target1Cell.appendChild(createInlineAudio({ ...target1, label: "Target1" }, true));
      target1Cell.addEventListener("click", () => {
        selectedSubsetKey = subset.key;
        render();
      });
      cells.push(target1Cell);

      const target2Cell = document.createElement("div");
      target2Cell.className = `${rowClass} matrix-audio-cell`;
      target2Cell.appendChild(createInlineAudio({ ...target2, label: "Target2" }, true));
      target2Cell.addEventListener("click", () => {
        selectedSubsetKey = subset.key;
        render();
      });
      cells.push(target2Cell);

      MODALITY_ORDER.forEach((modality) => {
        const cell = document.createElement("div");
        cell.className = `${rowClass} matrix-prompt-cell${subset.modalities.includes(modality) ? " active" : ""}`;
        cell.innerHTML = `
          <span class="prompt-cell-value">${subset.modalities.includes(modality) ? MODALITY_LABELS[modality] : "-"}</span>
          <span class="prompt-cell-meta">${subset.canonicalKey}</span>
        `;
        cell.addEventListener("click", () => {
          selectedSubsetKey = subset.key;
          render();
        });
        cells.push(cell);
      });

      cells.forEach((cell) => subsetGridEl.appendChild(cell));
    });

    const selectedRow = subsets.find((subset) => subset.key === selectedSubsetKey);
    if (!selectedRow) {
      selectedSubsetKey = subsets[0].key;
    }

    renderResultPanel(sample, target);
  }

  function render() {
    const sample = getCurrentSample();
    const target = getCurrentTarget(sample);
    renderSampleTabs();
    renderTargetTabs(sample);
    renderSummary(sample, target);
    renderReferenceAudio(sample);
    renderMetricStrip(sample, target);
    renderSubsetGrid(sample);
  }

  render();
})();
