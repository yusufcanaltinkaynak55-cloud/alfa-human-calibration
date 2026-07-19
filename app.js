(function () {
  "use strict";

  const PACKAGE = window.ALFA_PUBLIC_PILOT;
  const RUNTIME = window.ALFA_PUBLIC_RUNTIME || {};
  const STORAGE_KEY = "alfa_public_annotation_v2";
  const REMOTE_CONSENT_VERSION = "alfa_remote_submission_consent_v2";
  const EXPORT_SCHEMA = "alfa_public_bilingual_annotation_block_export_v2";
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

  function blockItems(blockId) {
    return PACKAGE.items.filter((item) => item.blockId === blockId);
  }

  function orderedIds(code, blockId) {
    const ids = blockItems(blockId).map((item) => item.id);
    let seed = seedFrom(`${PACKAGE.packageId}:${blockId}:${code}`);
    for (let index = ids.length - 1; index > 0; index -= 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const swapIndex = seed % (index + 1);
      [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    }
    return ids;
  }

  function emptyBlock(block, participantCode = "") {
    return {
      blockId: block.id,
      blockIndex: block.order,
      submissionId: newSubmissionId(),
      order: participantCode ? orderedIds(participantCode, block.id) : [],
      annotations: {},
      remoteSubmission: null,
      startedAt: null,
      updatedAt: null
    };
  }

  function emptyState() {
    return {
      schemaVersion: "alfa_public_annotation_state_v2",
      packageId: PACKAGE.packageId,
      participantCode: "",
      consentedAt: null,
      startedAt: null,
      activeBlockIndex: 0,
      blocks: Object.fromEntries(PACKAGE.blocks.map((block) => [block.id, emptyBlock(block)])),
      updatedAt: null
    };
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (
        !parsed
        || parsed.schemaVersion !== "alfa_public_annotation_state_v2"
        || parsed.packageId !== PACKAGE.packageId
        || !parsed.blocks
      ) {
        return emptyState();
      }
      const restored = emptyState();
      restored.participantCode = safeCode(parsed.participantCode);
      restored.consentedAt = parsed.consentedAt || null;
      restored.startedAt = parsed.startedAt || null;
      restored.activeBlockIndex = Number.isInteger(parsed.activeBlockIndex)
        ? Math.min(Math.max(parsed.activeBlockIndex, 0), PACKAGE.blocks.length - 1)
        : 0;
      restored.updatedAt = parsed.updatedAt || null;
      for (const block of PACKAGE.blocks) {
        const candidate = parsed.blocks[block.id] || {};
        const expectedIds = new Set(blockItems(block.id).map((item) => item.id));
        const candidateOrder = Array.isArray(candidate.order)
          ? candidate.order.filter((id) => expectedIds.has(id))
          : [];
        restored.blocks[block.id] = {
          ...emptyBlock(block, restored.participantCode),
          ...candidate,
          blockId: block.id,
          blockIndex: block.order,
          submissionId: candidate.submissionId || newSubmissionId(),
          order: candidateOrder.length === block.itemCount
            ? candidateOrder
            : orderedIds(restored.participantCode, block.id),
          annotations: candidate.annotations || {},
          remoteSubmission: candidate.remoteSubmission || null
        };
      }
      return restored;
    } catch (_error) {
      return emptyState();
    }
  }

  function persist() {
    state.updatedAt = new Date().toISOString();
    const blockState = currentBlockState();
    if (blockState) blockState.updatedAt = state.updatedAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function activeBlockDefinition() {
    return PACKAGE.blocks[state.activeBlockIndex];
  }

  function currentBlockState() {
    const block = activeBlockDefinition();
    return block ? state.blocks[block.id] : null;
  }

  function itemById(id) {
    return PACKAGE.items.find((item) => item.id === id);
  }

  function currentItem() {
    const blockState = currentBlockState();
    return blockState ? itemById(blockState.order[currentIndex]) : null;
  }

  function completedCount(blockState = currentBlockState()) {
    if (!blockState) return 0;
    return blockState.order.filter((id) => Boolean(blockState.annotations[id]?.decisionClass)).length;
  }

  function totalCompletedCount() {
    return PACKAGE.blocks.reduce((sum, block) => sum + completedCount(state.blocks[block.id]), 0);
  }

  function isCurrentBlockSubmitted() {
    return Boolean(currentBlockState()?.remoteSubmission?.receiptId);
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

  function annotationRows(blockState = currentBlockState()) {
    return blockState.order
      .filter((id) => Boolean(blockState.annotations[id]?.decisionClass))
      .map((id, index) => ({
        sampleId: id,
        orderIndex: index,
        decisionClass: blockState.annotations[id].decisionClass,
        confidence: blockState.annotations[id].confidence,
        note: blockState.annotations[id].note || "",
        firstSeenAt: blockState.annotations[id].firstSeenAt,
        updatedAt: blockState.annotations[id].updatedAt
      }));
  }

  function buildPayload() {
    const block = activeBlockDefinition();
    const blockState = currentBlockState();
    const rows = annotationRows(blockState);
    return {
      schemaVersion: EXPORT_SCHEMA,
      packageId: PACKAGE.packageId,
      blockId: block.id,
      blockIndex: block.order,
      submissionId: blockState.submissionId,
      participantCode: state.participantCode,
      annotationType: "independent_blind_human",
      consentVersion: REMOTE_CONSENT_VERSION,
      modelOutputWasVisible: false,
      expectedLabelsWereVisible: false,
      consentedAt: state.consentedAt,
      blockStartedAt: blockState.startedAt,
      exportedAt: new Date().toISOString(),
      completedCount: rows.length,
      totalCount: block.itemCount,
      masterBankItemCount: PACKAGE.items.length,
      annotations: rows
    };
  }

  function renderBlockProgress() {
    const pills = byId("blockPills");
    pills.replaceChildren();
    PACKAGE.blocks.forEach((block, index) => {
      const blockState = state.blocks[block.id];
      const complete = completedCount(blockState);
      const submitted = Boolean(blockState.remoteSubmission?.receiptId);
      const pill = document.createElement("div");
      pill.className = "block-pill";
      pill.classList.toggle("is-current", index === state.activeBlockIndex);
      pill.classList.toggle("is-complete", submitted);
      const number = document.createElement("strong");
      number.textContent = `${block.order}`;
      const label = document.createElement("span");
      label.textContent = submitted ? "Teslim · Sent" : `${complete}/${block.itemCount}`;
      pill.append(number, label);
      pills.append(pill);
    });
  }

  function setAnnotationLocked(locked) {
    annotationForm.querySelectorAll("input, textarea, button").forEach((control) => {
      control.disabled = locked;
    });
    byId("previousButton").disabled = locked || currentIndex === 0;
  }

  function updateSubmissionUI() {
    const button = byId("submitResultsButton");
    const hint = byId("submissionHint");
    const status = byId("submissionStatus");
    const nextButton = byId("nextBlockButton");
    const finalPanel = byId("finalPanel");
    if (!button || !hint || !status || !nextButton || !finalPanel) return;
    const block = activeBlockDefinition();
    const blockState = currentBlockState();
    const completed = completedCount(blockState);
    const configured = remoteSubmissionConfigured();
    const receipt = blockState.remoteSubmission?.receiptId;
    const finalBlock = state.activeBlockIndex === PACKAGE.blocks.length - 1;
    button.disabled = completed !== block.itemCount || !configured || Boolean(receipt);
    nextButton.hidden = !receipt || finalBlock;
    finalPanel.hidden = !receipt || !finalBlock;
    if (receipt) {
      hint.textContent = `Teslim numarası · Receipt: ${receipt}`;
      status.className = "submission-status is-success";
      status.textContent = finalBlock
        ? "Üçüncü bölüm güvenli biçimde teslim edildi. 150 maddelik çalışma tamamlandı. · All three blocks are complete."
        : "Bu 50 maddelik bölüm güvenli biçimde teslim edildi. Sonraki bölüme geçebilirsiniz. · This 50-item block was securely submitted.";
    } else if (!configured) {
      hint.textContent = "Güvenli gönderim henüz yapılandırılmadı. Bölüm JSON dışa aktarımı kullanılabilir. · Secure submission is not configured.";
      status.className = "submission-status";
      status.textContent = "";
    } else if (completed !== block.itemCount) {
      const remaining = block.itemCount - completed;
      hint.textContent = `Önce bu bölümde ${remaining} örneği daha tamamlayın. · Complete ${remaining} more item(s) in this block.`;
      status.className = "submission-status";
      status.textContent = "";
    } else {
      hint.textContent = "Bölüm hazır: erişim kodunu girin ve gönderimi onaylayın. · Block ready: enter the access code and confirm.";
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
    const blockState = currentBlockState();
    const target = byId("sampleButtons");
    target.replaceChildren();
    blockState.order.forEach((id, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1);
      button.dataset.index = String(index);
      button.classList.toggle("is-current", index === currentIndex);
      button.classList.toggle("is-complete", Boolean(blockState.annotations[id]?.decisionClass));
      button.setAttribute("aria-label", `Örnek ${index + 1} · Sample ${index + 1}`);
      button.disabled = isCurrentBlockSubmitted();
      button.addEventListener("click", () => {
        currentIndex = index;
        render();
      });
      target.append(button);
    });
  }

  function render() {
    const block = activeBlockDefinition();
    const blockState = currentBlockState();
    const item = currentItem();
    if (!block || !blockState || !item) return;
    const annotation = blockState.annotations[item.id] || {};
    byId("sampleId").textContent = item.id;
    byId("blockLabel").textContent = `Bölüm ${block.order}/${PACKAGE.blocks.length} · Block ${block.order}/${PACKAGE.blocks.length}`;
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
    const completed = completedCount(blockState);
    const totalCompleted = totalCompletedCount();
    byId("progressText").textContent = `${completed} / ${block.itemCount}`;
    byId("totalProgressText").textContent = `${totalCompleted} / ${PACKAGE.items.length} toplam · total`;
    byId("progressBar").style.width = `${(completed / block.itemCount) * 100}%`;
    formMessage.textContent = "";
    renderBlockProgress();
    renderNavigation();
    setAnnotationLocked(isCurrentBlockSubmitted());
    updateSubmissionUI();
  }

  function openWorkspace() {
    consentPanel.hidden = true;
    workspace.hidden = false;
    const blockState = currentBlockState();
    if (!blockState.startedAt) {
      blockState.startedAt = new Date().toISOString();
      persist();
    }
    buildOptions();
    render();
  }

  byId("consentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const code = safeCode(byId("participantCode").value);
    if (!code || !byId("consentCheck").checked) return;
    const now = new Date().toISOString();
    state = emptyState();
    state.participantCode = code;
    state.consentedAt = now;
    state.startedAt = now;
    state.activeBlockIndex = 0;
    state.blocks = Object.fromEntries(PACKAGE.blocks.map((block, index) => {
      const blockState = emptyBlock(block, code);
      blockState.startedAt = index === 0 ? now : null;
      return [block.id, blockState];
    }));
    persist();
    currentIndex = 0;
    openWorkspace();
  });

  annotationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isCurrentBlockSubmitted()) return;
    const block = activeBlockDefinition();
    const blockState = currentBlockState();
    const item = currentItem();
    const decision = annotationForm.querySelector('input[name="decisionClass"]:checked');
    const confidence = annotationForm.querySelector('input[name="confidence"]:checked');
    if (!decision || !confidence) {
      formMessage.textContent = "Sınıf ve güven seçin. · Select a class and confidence.";
      return;
    }
    const previous = blockState.annotations[item.id] || {};
    blockState.annotations[item.id] = {
      decisionClass: decision.value,
      confidence: Number(confidence.value),
      note: byId("annotationNote").value.trim(),
      firstSeenAt: previous.firstSeenAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    persist();
    if (currentIndex < blockState.order.length - 1) currentIndex += 1;
    render();
    if (completedCount(blockState) === block.itemCount) {
      formMessage.textContent = "Bu bölüm tamamlandı. Aşağıdan güvenli gönderim yapın. · This block is complete. Submit it securely below.";
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
    anchor.download = `ALFA_${PACKAGE.packageId}_${activeBlockDefinition().id}_${state.participantCode}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  byId("submissionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const block = activeBlockDefinition();
    const blockState = currentBlockState();
    const button = byId("submitResultsButton");
    const status = byId("submissionStatus");
    const accessInput = byId("studyAccessCode");
    const consent = byId("remoteConsentCheck");
    if (!remoteSubmissionConfigured()) {
      status.className = "submission-status is-error";
      status.textContent = "Güvenli gönderim henüz yapılandırılmadı. · Secure submission is not configured.";
      return;
    }
    if (completedCount(blockState) !== block.itemCount) {
      status.className = "submission-status is-error";
      status.textContent = "Göndermeden önce bu bölümdeki 50 örneği tamamlayın. · Complete all 50 items in this block.";
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
      blockState.remoteSubmission = {
        status: "submitted",
        receiptId: result.receiptId,
        receivedAt: result.receivedAt || null,
        submittedAt: new Date().toISOString()
      };
      persist();
      accessInput.value = "";
      consent.checked = false;
      render();
    } catch (error) {
      const code = error?.name === "AbortError" ? "TIMEOUT" : String(error?.message || "SUBMISSION_FAILED");
      status.className = "submission-status is-error";
      status.textContent = code === "INVALID_STUDY_ACCESS"
        ? "Çalışma erişim kodu geçersiz. · Invalid study access code."
        : "Teslim tamamlanamadı; yerel yanıtlarınız korunuyor. Yeniden deneyebilir veya bölüm JSON'unu indirebilirsiniz. · Submission failed; your local responses are safe.";
      button.disabled = false;
    } finally {
      clearTimeout(timeout);
      button.textContent = "Bu bölümü güvenli gönder · Securely submit this block";
    }
  });

  byId("nextBlockButton").addEventListener("click", () => {
    if (!isCurrentBlockSubmitted() || state.activeBlockIndex >= PACKAGE.blocks.length - 1) return;
    state.activeBlockIndex += 1;
    const blockState = currentBlockState();
    if (!blockState.startedAt) blockState.startedAt = new Date().toISOString();
    currentIndex = 0;
    byId("submissionForm").reset();
    persist();
    render();
    byId("annotation").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  byId("resetButton").addEventListener("click", () => {
    const confirmed = window.confirm(
      "Üç bölümdeki tüm yerel ilerleme silinsin mi? / Delete all local progress across three blocks?"
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

  if (
    state.consentedAt
    && state.participantCode
    && PACKAGE.blocks.every((block) => state.blocks[block.id]?.order?.length === block.itemCount)
  ) {
    openWorkspace();
  }
})();
