(function () {
  "use strict";

  const PACKAGE = window.ALFA_PUBLIC_PILOT;
  const STORAGE_KEY = "alfa_public_annotation_v1";
  const DECISIONS = [
    ["NET_MEANING", "Net Anlam", "Clear Meaning"],
    ["MEANINGFUL_NOISE", "Gürültülü ama Anlamlı", "Noisy but Meaningful"],
    ["CONTRADICTION", "Çelişkili Metin", "Contradictory Text"],
    ["SEMANTIC_INCOHERENCE", "Anlamsal Tutarsızlık", "Semantic Incoherence"],
    ["NO_MEANING", "Anlam Çıkarılamadı", "No Meaning Recovered"]
  ];
  const CONFIDENCE = [
    [1, "Çok düşük", "Very low"],
    [2, "Düşük", "Low"],
    [3, "Orta", "Medium"],
    [4, "Yüksek", "High"],
    [5, "Çok yüksek", "Very high"]
  ];

  const byId = (id) => document.getElementById(id);
  const consentPanel = byId("consentPanel");
  const workspace = byId("workspace");
  const annotationForm = byId("annotationForm");
  const formMessage = byId("formMessage");

  let state = readState();
  let currentIndex = 0;

  function safeCode(value) {
    return String(value || "")
      .trim()
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 32);
  }

  function seedFrom(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function orderedIds(code) {
    const ids = PACKAGE.items.map((item) => item.id);
    let seed = seedFrom(`${PACKAGE.packageId}:${code}`);
    for (let index = ids.length - 1; index > 0; index -= 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const swapIndex = seed % (index + 1);
      [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    }
    return ids;
  }

  function emptyState() {
    return {
      schemaVersion: "alfa_public_annotation_state_v1",
      packageId: PACKAGE.packageId,
      participantCode: "",
      consentedAt: null,
      order: [],
      annotations: {},
      startedAt: null,
      updatedAt: null
    };
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || parsed.packageId !== PACKAGE.packageId) return emptyState();
      return { ...emptyState(), ...parsed, annotations: parsed.annotations || {} };
    } catch (_error) {
      return emptyState();
    }
  }

  function persist() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function itemById(id) {
    return PACKAGE.items.find((item) => item.id === id);
  }

  function currentItem() {
    return itemById(state.order[currentIndex]);
  }

  function completedCount() {
    return state.order.filter((id) => Boolean(state.annotations[id]?.decisionClass)).length;
  }

  function buildOptions() {
    const decisionGrid = byId("decisionGrid");
    decisionGrid.replaceChildren();
    for (const [value, tr, en] of DECISIONS) {
      const wrapper = document.createElement("div");
      wrapper.className = "decision-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "decisionClass";
      input.id = `decision-${value}`;
      input.value = value;
      const label = document.createElement("label");
      label.htmlFor = input.id;
      const strong = document.createElement("strong");
      strong.textContent = tr;
      const span = document.createElement("span");
      span.textContent = en;
      label.append(strong, span);
      wrapper.append(input, label);
      decisionGrid.append(wrapper);
    }

    const confidenceGrid = byId("confidenceGrid");
    confidenceGrid.replaceChildren();
    for (const [value, tr, en] of CONFIDENCE) {
      const wrapper = document.createElement("div");
      wrapper.className = "confidence-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "confidence";
      input.id = `confidence-${value}`;
      input.value = String(value);
      const label = document.createElement("label");
      label.htmlFor = input.id;
      const strong = document.createElement("strong");
      strong.textContent = String(value);
      const span = document.createElement("span");
      span.textContent = `${tr} · ${en}`;
      label.append(strong, span);
      wrapper.append(input, label);
      confidenceGrid.append(wrapper);
    }
  }

  function renderNavigation() {
    const target = byId("sampleButtons");
    target.replaceChildren();
    state.order.forEach((id, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1);
      button.dataset.index = String(index);
      button.classList.toggle("is-current", index === currentIndex);
      button.classList.toggle("is-complete", Boolean(state.annotations[id]?.decisionClass));
      button.setAttribute("aria-label", `Örnek ${index + 1} · Sample ${index + 1}`);
      button.addEventListener("click", () => {
        currentIndex = index;
        render();
      });
      target.append(button);
    });
  }

  function render() {
    const item = currentItem();
    if (!item) return;
    const annotation = state.annotations[item.id] || {};
    byId("sampleId").textContent = item.id;
    byId("textTr").textContent = item.tr;
    byId("textEn").textContent = item.en;
    byId("annotationNote").value = annotation.note || "";
    byId("noteCount").textContent = String((annotation.note || "").length);
    annotationForm.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = (
        (input.name === "decisionClass" && input.value === annotation.decisionClass)
        || (input.name === "confidence" && Number(input.value) === Number(annotation.confidence))
      );
    });
    const completed = completedCount();
    byId("progressText").textContent = `${completed} / ${state.order.length}`;
    byId("progressBar").style.width = `${(completed / state.order.length) * 100}%`;
    byId("previousButton").disabled = currentIndex === 0;
    formMessage.textContent = "";
    renderNavigation();
  }

  function openWorkspace() {
    consentPanel.hidden = true;
    workspace.hidden = false;
    buildOptions();
    render();
  }

  byId("consentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const code = safeCode(byId("participantCode").value);
    if (!code || !byId("consentCheck").checked) return;
    state = emptyState();
    state.participantCode = code;
    state.consentedAt = new Date().toISOString();
    state.startedAt = state.consentedAt;
    state.order = orderedIds(code);
    persist();
    currentIndex = 0;
    openWorkspace();
  });

  annotationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = currentItem();
    const decision = annotationForm.querySelector('input[name="decisionClass"]:checked');
    const confidence = annotationForm.querySelector('input[name="confidence"]:checked');
    if (!decision || !confidence) {
      formMessage.textContent = "Sınıf ve güven seçin. · Select a class and confidence.";
      return;
    }
    const previous = state.annotations[item.id] || {};
    state.annotations[item.id] = {
      decisionClass: decision.value,
      confidence: Number(confidence.value),
      note: byId("annotationNote").value.trim(),
      firstSeenAt: previous.firstSeenAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    persist();
    if (currentIndex < state.order.length - 1) currentIndex += 1;
    render();
    if (completedCount() === state.order.length) {
      formMessage.textContent = "Tüm örnekler tamamlandı. JSON dosyasını dışa aktarın. · All items complete. Export the JSON file.";
    }
  });

  byId("previousButton").addEventListener("click", () => {
    if (currentIndex > 0) currentIndex -= 1;
    render();
  });

  byId("annotationNote").addEventListener("input", (event) => {
    byId("noteCount").textContent = String(event.target.value.length);
  });

  byId("exportButton").addEventListener("click", () => {
    const rows = state.order
      .filter((id) => Boolean(state.annotations[id]?.decisionClass))
      .map((id, index) => ({
        sampleId: id,
        orderIndex: index,
        decisionClass: state.annotations[id].decisionClass,
        confidence: state.annotations[id].confidence,
        note: state.annotations[id].note || "",
        firstSeenAt: state.annotations[id].firstSeenAt,
        updatedAt: state.annotations[id].updatedAt
      }));
    const payload = {
      schemaVersion: "alfa_public_bilingual_annotation_export_v1",
      packageId: PACKAGE.packageId,
      participantCode: state.participantCode,
      annotationType: "independent_blind_human",
      modelOutputWasVisible: false,
      expectedLabelsWereVisible: false,
      consentedAt: state.consentedAt,
      exportedAt: new Date().toISOString(),
      completedCount: rows.length,
      totalCount: state.order.length,
      annotations: rows
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ALFA_${PACKAGE.packageId}_${state.participantCode}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  byId("resetButton").addEventListener("click", () => {
    const confirmed = window.confirm(
      "Yerel ilerleme silinsin mi? / Delete local progress?"
    );
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    state = emptyState();
    currentIndex = 0;
    workspace.hidden = true;
    consentPanel.hidden = false;
    byId("consentForm").reset();
  });

  if (state.consentedAt && state.order.length === PACKAGE.items.length) {
    openWorkspace();
  }
})();
