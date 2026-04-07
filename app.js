(function () {
  const data = window.DEMO_DATA;
  if (!data || !Array.isArray(data.samples) || !data.samples.length) {
    throw new Error("DEMO_DATA is missing or invalid.");
  }

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

  function renderSubsetGrid(sample) {
    const subsets = sortSubsets(sample.subsets);
    const mixture = sample.references.mixture;
    const target1 = sample.references.target1;
    const target2 = sample.references.target2;

    subsetGridEl.innerHTML = "";

    const headerLabels = ["Mixed Speech", "Target1", "Target2", "visual", "text", "pre-enrollment", "spatial"];
    headerLabels.forEach((label) => {
      const cell = document.createElement("div");
      cell.className = "matrix-header-cell";
      cell.textContent = label;
      subsetGridEl.appendChild(cell);
    });

    subsets.forEach((subset, index) => {
      const cells = [];
      const mixtureCell = document.createElement("div");
      mixtureCell.className = "matrix-row matrix-audio-cell";
      mixtureCell.appendChild(createInlineAudio({ ...mixture, label: `Row ${index + 1} · Mixture` }, true));
      cells.push(mixtureCell);

      const target1Cell = document.createElement("div");
      target1Cell.className = "matrix-row matrix-audio-cell";
      target1Cell.appendChild(createInlineAudio({ ...target1, label: "Target1" }, true));
      cells.push(target1Cell);

      const target2Cell = document.createElement("div");
      target2Cell.className = "matrix-row matrix-audio-cell";
      target2Cell.appendChild(createInlineAudio({ ...target2, label: "Target2" }, true));
      cells.push(target2Cell);

      MODALITY_ORDER.forEach((modality) => {
        const cell = document.createElement("div");
        cell.className = `matrix-row matrix-prompt-cell${subset.modalities.includes(modality) ? " active" : ""}`;
        cell.innerHTML = `
          <span class="prompt-cell-value">${subset.modalities.includes(modality) ? MODALITY_LABELS[modality] : "-"}</span>
          <span class="prompt-cell-meta">${subset.canonicalKey}</span>
        `;
        cells.push(cell);
      });

      cells.forEach((cell) => subsetGridEl.appendChild(cell));
    });
  }

  function render() {
    const sample = getCurrentSample();
    renderSubsetGrid(sample);
  }

  render();
})();
