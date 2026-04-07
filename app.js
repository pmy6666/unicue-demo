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
  const spotlightEl = document.getElementById("subset-spotlight");
  const subsetGridEl = document.getElementById("subset-grid");

  const SUBSET_FALLBACK = data.samples[0].subsets;
  let sampleIndex = 0;
  let targetIndex = 0;

  function subsetDescription(modalityCount) {
    if (modalityCount === 1) return "Single-cue subset";
    if (modalityCount === 2) return "Two-cue fusion";
    if (modalityCount === 3) return "Three-cue fusion";
    return "Full four-cue fusion";
  }

  function getSubsetTone(modalityCount) {
    if (modalityCount === 1) return "single";
    if (modalityCount === 2) return "dual";
    if (modalityCount === 3) return "triple";
    return "full";
  }

  function getCurrentSample() {
    const sample = data.samples[sampleIndex];
    return {
      ...sample,
      subsets: sample.subsets && sample.subsets.length ? sample.subsets : SUBSET_FALLBACK,
    };
  }

  function getCurrentTarget(sample) {
    return sample.targetProfiles[targetIndex];
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
    hint.textContent = item.available
      ? item.path
      : `Placeholder path: ${item.path}`;

    wrapper.append(title, audio, hint);
    return wrapper;
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
    targetNote.className = "summary-note";
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
    const worst = Math.min(...scores);
    const average = scores.reduce((acc, value) => acc + value, 0) / scores.length;
    const fullFusion = sample.subsets.find((subset) => subset.modalities.length === 4);

    metricStripEl.innerHTML = `
      <article class="metric-card">
        <h3>Baseline Mixture SI-SNR</h3>
        <strong>${target.baselineMixSiSnr}</strong>
        <p>Raw target difficulty before any prompt-guided extraction.</p>
      </article>
      <article class="metric-card">
        <h3>Best SI-SNRi</h3>
        <strong>${best.toFixed(1)} dB</strong>
        <p>Highest subset score for the selected target profile.</p>
      </article>
      <article class="metric-card">
        <h3>Average Across 15 Subsets</h3>
        <strong>${average.toFixed(1)} dB</strong>
        <p>Mean prompt robustness over the full subset lattice.</p>
      </article>
      <article class="metric-card">
        <h3>Full Fusion SI-SNRi</h3>
        <strong>${fullFusion.targetScores[target.id].toFixed(1)} dB</strong>
        <p>Reference point when all modalities are active together.</p>
      </article>
    `;
  }

  function renderSpotlight(sample, target) {
    const bestSubset = [...sample.subsets].sort(
      (a, b) => b.targetScores[target.id] - a.targetScores[target.id]
    )[0];

    spotlightEl.innerHTML = `
      <div class="spotlight-copy">
        <h3>Best subset for ${target.label}: ${bestSubset.key}</h3>
        <p>
          ${bestSubset.note}
          This card is useful for quickly communicating to reviewers which prompt combination
          is most reliable on the selected target in this scene.
        </p>
      </div>
      <div class="spotlight-score">
        <span>Selected Target SI-SNRi</span>
        <strong>${bestSubset.targetScores[target.id].toFixed(1)} dB</strong>
      </div>
    `;
  }

  function renderSubsetGrid(sample, target) {
    const sorted = [...sample.subsets].sort(
      (a, b) => b.targetScores[target.id] - a.targetScores[target.id]
    );

    subsetGridEl.innerHTML = "";
    sorted.forEach((subset, index) => {
      const card = document.createElement("article");
      const isBest = index === 0;
      card.className = `subset-card${isBest ? " best" : ""}`;
      const modalityTone = getSubsetTone(subset.modalities.length);
      const chips = subset.modalities
        .map((modality) => `<span class="chip ${modality}">${modality}</span>`)
        .join("");

      const availableText = subset.available
        ? subset.audio[target.id]
        : `Placeholder path: ${subset.audio[target.id]}`;

      card.innerHTML = `
        <div class="subset-card-head">
          <div>
            <h3>${subset.key}</h3>
            <p class="subset-note">${subsetDescription(subset.modalities.length)}</p>
          </div>
          <div class="subset-rank">#${index + 1}</div>
        </div>
        <div class="chip-row tone-${modalityTone}">${chips}</div>
        <div class="subset-meta">
          <div class="meta-box">
            <span>Selected Target SI-SNRi</span>
            <strong>${subset.targetScores[target.id].toFixed(1)} dB</strong>
          </div>
          <div class="meta-box">
            <span>Mean Over Targets</span>
            <strong>${subset.meanSiSnri.toFixed(1)} dB</strong>
          </div>
        </div>
        <p class="subset-note">${subset.note}</p>
        <audio controls preload="none">
          <source src="${subset.available ? subset.audio[target.id] : ""}" type="audio/wav" />
        </audio>
        <p class="placeholder">${availableText}</p>
      `;
      subsetGridEl.appendChild(card);
    });
  }

  function render() {
    const sample = getCurrentSample();
    const target = getCurrentTarget(sample);
    renderSampleTabs();
    renderTargetTabs(sample);
    renderSummary(sample, target);
    renderReferenceAudio(sample);
    renderMetricStrip(sample, target);
    renderSpotlight(sample, target);
    renderSubsetGrid(sample, target);
  }

  render();
})();
