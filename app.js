(function () {
  "use strict";

  const PACKAGE = window.ALFA_PUBLIC_PILOT;
  const RUNTIME = window.ALFA_PUBLIC_RUNTIME || {};
  const STORAGE_KEY = "alfa_public_annotation_v1";
  const REMOTE_CONSENT_VERSION = "alfa_remote_submission_consent_v1";
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

  function newSubmissionId() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

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
      submissionId: newSubmissionId(),
      consentedAt: null,
      order: [],
      annotations: {},
      remoteSubmission: null,
      startedAt: null,
      updatedAt: null
    };
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || parsed.packageId !== PACKAGE.packageId) return emptyState();
      return {
        ...emptyState(),
        ...parsed,
        submissionId: parsed.submissionId || newSubmissionId(),
        annotations: parsed.annotations || {},
        remoteSubmission: parsed.remoteSubmission || null
      };
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

  function remoteSubmissionConfigured() {
    if (RUNTIME.submissionEnabled !== true) return false;
    try {
      const endpoint = new URL(RUNTIME.submissionEndpoint);
      return (
        endpoint.protocol === "https:"
        && endpoint.hostname.endsWith(".supabase.co")
        && endpoint.pathname === "/functions/v1/submit-annotations"
      );
    } catch (_error) {
      return false;
    }
  }

  function annotationRows() {
    return state.order
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
  }

  function buildPayload() {
    const rows = annotationRows();
    return {
      schemaVersion: "alfa_public_bilingual_annotation_export_v1",
      packageId: PACKAGE.packageId,
      submissionId: state.submissionId,
      participantCode: state.participantCode,
      annotationType: "independent_blind_human",
      consentVersion: REMOTE_CONSENT_VERSION,
      modelOutputWasVisible: false,
      expectedLabelsWereVisible: false,
      consentedAt: state.consentedAt,
      exportedAt: new Date().toISOString(),
      completedCount: rows.length,
      totalCount: state.order.length,
      annotations: rows
    };
  }

  function updateSubmissionUI() {
    const button = byId("submitResultsButton");
    const hint = byId("submissionHint");
    const status = byId("submissionStatus");
    if (!button || !hint || !status) return;
    const completed = completedCount();
    const configured = remoteSubmissionConfigured();
    const receipt = state.remoteSubmission?.receiptId;
    button.disabled = completed !== state.order.length || !configured || Boolean(receipt);
    if (receipt) {
      hint.textContent = `Teslim numarası · Receipt: ${receipt}`;
      status.className = "submission-status is-success";
      status.textContent = "Sonuçlar güvenli biçimde teslim edildi. Sonraki yerel değişiklikler bu teslimi değiştirmez. · Results were securely submitted.";
    } else if (!configured) {
      hint.textContent = "Güvenli gönderim henüz yapılandırılmadı. JSON dışa aktarımı kullanılabilir. · Secure submission is not configured yet.";
      status.className = "submission-status";
      status.textContent = "";
    } else if (completed !== state.order.length) {
      hint.textContent = `Önce ${state.order.length - completed} örneği daha tamamlayın. · Complete ${state.order.length - completed} more item(s).`;
      status.className = "submission-status";
      status.textContent = "";
    } else {
      hint.textContent = "Hazır: erişim kodunu ve onayı tamamlayın. · Ready: enter the access code and confirm consent.";
      status.className = "submission-status";
      status.textContent = "";
    }
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
    updateSubmissionUI();
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
    const payload = buildPayload();
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

  byId("submissionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = byId("submitResultsButton");
    const status = byId("submissionStatus");
    const accessInput = byId("studyAccessCode");
    const consent = byId("remoteConsentCheck");
    if (!remoteSubmissionConfigured()) {
      status.className = "submission-status is-error";
      status.textContent = "Güvenli gönderim henüz yapılandırılmadı. · Secure submission is not configured.";
      return;
    }
    if (completedCount() !== state.order.length) {
      status.className = "submission-status is-error";
      status.textContent = "Göndermeden önce tüm örnekleri tamamlayın. · Complete all items before submission.";
      return;
    }
    if (!accessInput.value || !consent.checked) {
      status.className = "submission-status is-error";
      status.textContent = "Erişim kodunu girin ve uzak gönderimi onaylayın. · Enter the access code and confirm remote submission.";
      return;
    }
    button.disabled = true;
    button.textContent = "Gönderiliyor · Submitting…";
    status.className = "submission-status";
    status.textContent = "Şifreli bağlantı üzerinden teslim ediliyor… · Sending over an encrypted connection…";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(RUNTIME.submissionEndpoint, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "strict-origin",
        headers: {
          "Content-Type": "application/json",
          "X-ALFA-Study-Access": accessInput.value
        },
        body: JSON.stringify({
          ...buildPayload(),
          clientSubmittedAt: new Date().toISOString()
        }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true || !result.receiptId) {
        throw new Error(result.code || "SUBMISSION_REJECTED");
      }
      state.remoteSubmission = {
        status: "submitted",
        receiptId: result.receiptId,
        receivedAt: result.receivedAt || null,
        submittedAt: new Date().toISOString()
      };
      persist();
      accessInput.value = "";
      consent.checked = false;
      updateSubmissionUI();
    } catch (error) {
      const code = error?.name === "AbortError" ? "TIMEOUT" : String(error?.message || "SUBMISSION_FAILED");
      status.className = "submission-status is-error";
      status.textContent = code === "INVALID_STUDY_ACCESS"
        ? "Çalışma erişim kodu geçersiz. · Invalid study access code."
        : "Teslim tamamlanamadı; yerel yanıtlarınız korunuyor. Yeniden deneyebilir veya JSON indirebilirsiniz. · Submission failed; your local responses are safe.";
      button.disabled = false;
    } finally {
      clearTimeout(timeout);
      button.textContent = "Sonuçları güvenli gönder · Securely submit";
    }
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
    byId("submissionForm").reset();
  });

  if (state.consentedAt && state.order.length === PACKAGE.items.length) {
    openWorkspace();
  }
})();
