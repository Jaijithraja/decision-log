(function () {
  "use strict";

  var STORAGE_KEY = "decisionLog.decisions.v1";

  var SAMPLE_DECISIONS = [
    {
      id: "d1",
      decision: "Move to a freemium pricing model for the new onboarding flow",
      context: "Free trial conversion rate is only 2%. Competitors are undercutting us with free tiers, and our trial drop-off is highest at the paywall.",
      reasoning: "A free tier will lower the barrier to entry, increase product-led growth, and the data suggests activation—not monetization—is the bottleneck. We can revisit pricing once monthly active seats cross 5k.",
      owner: "Alex Chen",
      date: "2026-07-18",
      status: "Decided",
      createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000
    },
    {
      id: "d2",
      decision: "Adopt React Native for the upcoming mobile app instead of native iOS + Android",
      context: "We need to ship a mobile experience in two quarters with a small mobile team. Stakeholders are split between native and cross-platform.",
      reasoning: "Single codebase maximizes output given team size, and most features are data-parallel UI, not compute-heavy. Shrinkage risk on native performance is acceptable for v1.",
      owner: "Priya Sharma",
      date: "2026-06-30",
      status: "Proposed",
      createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000
    },
    {
      id: "d3",
      decision: "Roll back the 2026 Q2 pricing change",
      context: "After the July price increase, net revenue retention dropped 6% and churn spiked among mid-market accounts.",
      reasoning: "The price increase targeted the wrong segment. Powwowing with sales confirmed mid-market was price-sensitive and the feature backbone wasn't in place. Reverting, then re-architecting pricing in Q4.",
      owner: "Marcus Lee",
      date: "2026-08-02",
      status: "Reversed",
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
    },
    {
      id: "d4",
      decision: "Prioritize dark mode and accessibility before the analytics dashboard",
      context: "Design system supports light theme only. Chrome extension of analytics team finds accessibility blockers in current UI.",
      reasoning: "Accessibility is a hard compliance need and dark mode drives engagement among power users. Both were repeatedly requested; stacking them now reduces future rework.",
      owner: "Sofia Reyes",
      date: "2026-08-10",
      status: "Decided",
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
    }
  ];

  var state = {
    decisions: [],
    searchQuery: "",
    statusFilter: "all",
    editingId: null,
    viewingId: null
  };

  var els = {};

  function init() {
    cacheElements();
    loadDecisions();
    bindEvents();
    todayDefault();
    render();
  }

  function cacheElements() {
    els.dashboard = document.getElementById("dashboard");
    els.emptyState = document.getElementById("emptyState");
    els.searchInput = document.getElementById("searchInput");
    els.statusFilter = document.getElementById("statusFilter");
    els.resultCount = document.getElementById("resultCount");

    els.stats = document.getElementById("stats");
    els.statTotal = document.getElementById("statTotal");
    els.statProposed = document.getElementById("statProposed");
    els.statDecided = document.getElementById("statDecided");
    els.statReversed = document.getElementById("statReversed");

    els.addDecisionBtn = document.getElementById("addDecisionBtn");
    els.emptyAddBtn = document.getElementById("emptyAddBtn");

    els.extractBtn = document.getElementById("extractBtn");
    els.extractModal = document.getElementById("extractModal");
    els.extractTitle = document.getElementById("extractTitle");
    els.extractPane = document.getElementById("extractPane");
    els.extractForm = document.getElementById("extractForm");
    els.extractText = document.getElementById("extractText");
    els.extractRunBtn = document.getElementById("extractRunBtn");
    els.extractNoDecision = document.getElementById("extractNoDecision");
    els.extractError = document.getElementById("extractError");
    els.extractReviewWrap = document.getElementById("extractReviewWrap");
    els.extractReview = document.getElementById("extractReview");
    els.extractBackBtn = document.getElementById("extractBackBtn");
    els.closeExtractBtn = document.getElementById("closeExtractBtn");
    els.cancelExtractBtn = document.getElementById("cancelExtractBtn");

    els.decisionModal = document.getElementById("decisionModal");
    els.detailModal = document.getElementById("detailModal");
    els.modalTitle = document.getElementById("modalTitle");
    els.closeModalBtn = document.getElementById("closeModalBtn");
    els.cancelModalBtn = document.getElementById("cancelModalBtn");
    els.decisionForm = document.getElementById("decisionForm");

    els.decisionText = document.getElementById("decisionText");
    els.contextText = document.getElementById("contextText");
    els.reasoningText = document.getElementById("reasoningText");
    els.ownerText = document.getElementById("ownerText");
    els.dateInput = document.getElementById("dateInput");
    els.statusInput = document.getElementById("statusInput");

    els.closeDetailBtn = document.getElementById("closeDetailBtn");
    els.deleteBtn = document.getElementById("deleteBtn");
    els.editBtn = document.getElementById("editBtn");
    els.detailTitle = document.getElementById("detailTitle");
    els.detailStatus = document.getElementById("detailStatus");
    els.detailOwner = document.getElementById("detailOwner");
    els.detailDate = document.getElementById("detailDate");
    els.detailContext = document.getElementById("detailContext");
    els.detailReasoning = document.getElementById("detailReasoning");

    els.toast = document.getElementById("toast");
  }

  function loadDecisions() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    if (raw) {
      try {
        state.decisions = JSON.parse(raw);
      } catch (e) {
        state.decisions = [];
      }
    }

    if (!Array.isArray(state.decisions)) {
      state.decisions = [];
    }

    if (state.decisions.length === 0) {
      state.decisions = SAMPLE_DECISIONS.slice();
      persist();
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.decisions));
    } catch (e) {
      showToast("Could not save: storage unavailable");
    }
  }

  function bindEvents() {
    els.addDecisionBtn.addEventListener("click", openNewModal);
    els.emptyAddBtn.addEventListener("click", openNewModal);
    els.closeModalBtn.addEventListener("click", closeModal);
    els.cancelModalBtn.addEventListener("click", closeModal);
    els.closeDetailBtn.addEventListener("click", closeDetail);
    els.deleteBtn.addEventListener("click", deleteViewed);
    els.editBtn.addEventListener("click", editViewed);

    els.extractBtn.addEventListener("click", openExtract);
    els.closeExtractBtn.addEventListener("click", closeExtract);
    els.cancelExtractBtn.addEventListener("click", closeExtract);
    els.extractForm.addEventListener("submit", onExtractSubmit);
    els.extractBackBtn.addEventListener("click", resetExtractToInput);

    els.searchInput.addEventListener("input", function () {
      state.searchQuery = els.searchInput.value.trim();
      render();
    });

    els.statusFilter.addEventListener("change", function () {
      state.statusFilter = els.statusFilter.value;
      render();
    });

    els.decisionForm.addEventListener("submit", onFormSubmit);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!els.detailModal.hidden) {
          closeDetail();
        } else if (!els.decisionModal.hidden) {
          closeModal();
        } else if (!els.extractModal.hidden) {
          closeExtract();
        }
      }
    });

    [els.decisionModal, els.detailModal, els.extractModal].forEach(function (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
          overlay.hidden = true;
        }
      });
    });
  }

  function todayDefault() {
    els.dateInput.value = new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function openNewModal() {
    state.editingId = null;
    els.modalTitle.textContent = "Add Decision";
    els.decisionForm.reset();
    todayDefault();
    els.statusInput.value = "Proposed";
    els.decisionModal.hidden = false;
    els.decisionText.focus();
  }

  function openEditModal(id) {
    var d = state.decisions.find(function (x) { return x.id === id; });
    if (!d) return;

    state.editingId = id;
    els.modalTitle.textContent = "Edit Decision";
    els.decisionText.value = d.decision || "";
    els.contextText.value = d.context || "";
    els.reasoningText.value = d.reasoning || "";
    els.ownerText.value = d.owner || "";
    els.dateInput.value = d.date || "";
    els.statusInput.value = d.status || "Proposed";

    closeDetail();
    els.decisionModal.hidden = false;
  }

  function closeModal() {
    els.decisionModal.hidden = true;
    state.editingId = null;
  }

  function onFormSubmit(e) {
    e.preventDefault();

    if (!els.decisionForm.checkValidity()) {
      els.decisionForm.reportValidity();
      return;
    }

    var data = {
      decision: els.decisionText.value.trim(),
      context: els.contextText.value.trim(),
      reasoning: els.reasoningText.value.trim(),
      owner: els.ownerText.value.trim(),
      date: els.dateInput.value,
      status: els.statusInput.value
    };

    if (state.editingId) {
      var existing = state.decisions.find(function (x) { return x.id === state.editingId; });
      if (existing) {
        Object.assign(existing, data);
        showToast("Decision updated");
      }
    } else {
      data.id = uid();
      data.createdAt = Date.now();
      state.decisions.unshift(data);
      showToast("Decision added");
    }

    persist();
    closeModal();
    render();
  }

  function viewDecision(id) {
    var d = state.decisions.find(function (x) { return x.id === id; });
    if (!d) return;

    state.viewingId = id;
    els.detailTitle.textContent = d.decision;
    els.detailStatus.textContent = d.status;
    els.detailStatus.className = "badge " + d.status;
    els.detailOwner.textContent = "Owner: " + d.owner;
    els.detailDate.textContent = "Date: " + formatDate(d.date);
    els.detailContext.textContent = d.context || "";
    els.detailReasoning.textContent = d.reasoning || "";

    els.detailModal.hidden = false;
  }

  function closeDetail() {
    els.detailModal.hidden = true;
    state.viewingId = null;
  }

  function deleteViewed() {
    var id = state.viewingId;
    var d = state.decisions.find(function (x) { return x.id === id; });
    if (!d) return;

    if (!confirm('Delete "' + d.decision + '"?')) return;

    state.decisions = state.decisions.filter(function (x) { return x.id !== id; });
    persist();
    closeDetail();
    render();
    showToast("Decision deleted");
  }

  function editViewed() {
    if (state.viewingId) {
      openEditModal(state.viewingId);
    }
  }

  /* Extract from Text */
  function openExtract() {
    resetExtractToInput();
    els.extractModal.hidden = false;
    els.extractText.focus();
  }

  function closeExtract() {
    els.extractModal.hidden = true;
    setExtractLoading(false);
  }

  function resetExtractToInput() {
    els.extractPane.hidden = false;
    els.extractReviewWrap.hidden = true;
    els.extractReview.innerHTML = "";
    els.extractTitle.textContent = "Extract from Text";
    els.extractNoDecision.hidden = true;
    setExtractError("");
  }

  function setExtractError(msg) {
    els.extractError.textContent = msg || "";
    els.extractError.hidden = !msg;
  }

  function setExtractLoading(on) {
    els.extractRunBtn.disabled = on;
    els.extractRunBtn.textContent = on ? "Extracting\u2026" : "Extract";
  }

  function onExtractSubmit(e) {
    e.preventDefault();

    var text = els.extractText.value.trim();
    if (!text) {
      setExtractError("Please paste some text to extract from.");
      return;
    }

    setExtractError("");
    els.extractNoDecision.hidden = true;
    setExtractLoading(true);

    fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    })
      .then(function (res) {
        if (!res.ok) {
          var err = new Error("server");
          err.friendly = "Extraction failed on the server. Check that the API key is configured, then try again.";
          throw err;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.decisions)) {
          var err = new Error("shape");
          err.friendly = "The extraction service returned an unexpected response. Please try again.";
          throw err;
        }
        showExtractResults(data.decisions);
      })
      .catch(function (err) {
        setExtractError((err && err.friendly) || "Could not reach the extraction service. Please try again.");
      })
      .then(function () {
        setExtractLoading(false);
      });
  }

  function showExtractResults(decisions) {
    els.extractTitle.textContent = "Extract from Text";

    if (!decisions.length) {
      els.extractPane.hidden = false;
      els.extractReviewWrap.hidden = true;
      els.extractReview.innerHTML = "";
      els.extractNoDecision.hidden = false;
      return;
    }

    els.extractPane.hidden = true;
    els.extractReview.innerHTML = "";
    decisions.forEach(function (d, i) {
      els.extractReview.appendChild(buildReviewCard(d, i + 1));
    });
    els.extractReviewWrap.hidden = false;
    els.extractTitle.textContent = "Review extracted decisions";
  }

  function cleanStr(v) {
    return v === null || v === undefined ? "" : String(v).trim();
  }

  function buildReviewCard(d, index) {
    var today = new Date().toISOString().slice(0, 10);

    var card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML =
      '<div class="review-card-head">' +
        '<span class="review-card-index">' + index + "</span>" +
        '<span class="review-card-status">Not saved yet</span>' +
      "</div>" +
      '<div class="form-group"><label>Decision</label>' +
        '<input type="text" class="rw-title" required value="' + escapeHtml(cleanStr(d.title)) + '">' +
      "</div>" +
      '<div class="form-group"><label>Context / Problem</label>' +
        '<textarea class="rw-context" rows="3">' + escapeHtml(cleanStr(d.context)) + "</textarea>" +
      "</div>" +
      '<div class="form-group"><label>Reasoning</label>' +
        '<textarea class="rw-reasoning" rows="3">' + escapeHtml(cleanStr(d.reasoning)) + "</textarea>" +
      "</div>" +
      '<div class="form-row">' +
        '<div class="form-group"><label>Owner</label>' +
          '<input type="text" class="rw-owner" value="' + escapeHtml(cleanStr(d.owner)) + '"></div>' +
        '<div class="form-group"><label>Date</label>' +
          '<input type="date" class="rw-date" value="' + escapeHtml(d.date || today) + '"></div>' +
      "</div>" +
      '<div class="form-group"><label>Status</label>' +
        '<select class="rw-status">' +
          '<option value="Proposed">Proposed</option>' +
          '<option value="Decided">Decided</option>' +
          '<option value="Reversed">Reversed</option>' +
        "</select>" +
      "</div>" +
      '<div class="review-card-actions">' +
        '<button type="button" class="btn btn-ghost rw-discard">Discard</button>' +
        '<button type="button" class="btn btn-primary rw-save">Save</button>' +
      "</div>";

    card.querySelector(".rw-save").addEventListener("click", function () {
      var titleEl = card.querySelector(".rw-title");
      if (!titleEl.value.trim()) {
        titleEl.focus();
        return;
      }

      var data = {
        decision: titleEl.value.trim(),
        context: card.querySelector(".rw-context").value.trim(),
        reasoning: card.querySelector(".rw-reasoning").value.trim(),
        owner: card.querySelector(".rw-owner").value.trim(),
        date: card.querySelector(".rw-date").value,
        status: card.querySelector(".rw-status").value
      };

      data.id = uid();
      data.createdAt = Date.now();
      state.decisions.unshift(data);
      persist();
      render();
      showToast("Decision added");
      card.remove();
      afterReviewCardRemoved();
    });

    card.querySelector(".rw-discard").addEventListener("click", function () {
      card.remove();
      afterReviewCardRemoved();
    });

    return card;
  }

  function afterReviewCardRemoved() {
    if (els.extractReview.querySelector(".review-card")) return;
    resetExtractToInput();
  }

  function getFiltered() {
    var q = state.searchQuery.toLowerCase();

    return state.decisions.filter(function (d) {
      var matchesStatus = state.statusFilter === "all" || d.status === state.statusFilter;

      var matchesSearch = q === "" ||
        (d.decision && d.decision.toLowerCase().indexOf(q) !== -1) ||
        (d.context && d.context.toLowerCase().indexOf(q) !== -1) ||
        (d.reasoning && d.reasoning.toLowerCase().indexOf(q) !== -1) ||
        (d.owner && d.owner.toLowerCase().indexOf(q) !== -1);

      return matchesStatus && matchesSearch;
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function countByStatus(status) {
    return state.decisions.reduce(function (n, d) {
      return d.status === status ? n + 1 : n;
    }, 0);
  }

  function render() {
    var list = getFiltered();

    els.resultCount.textContent = list.length + (list.length === 1 ? " decision" : " decisions");

    els.statTotal.textContent = state.decisions.length;
    els.statProposed.textContent = countByStatus("Proposed");
    els.statDecided.textContent = countByStatus("Decided");
    els.statReversed.textContent = countByStatus("Reversed");

    if (state.decisions.length === 0) {
      els.dashboard.hidden = true;
      els.emptyState.hidden = false;
      els.stats.hidden = true;
      return;
    }

    els.emptyState.hidden = true;
    els.dashboard.hidden = false;
    els.stats.hidden = false;

    els.dashboard.innerHTML = "";

    list.forEach(function (d) {
      var card = document.createElement("article");
      card.className = "card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "View decision: " + d.decision);

      card.innerHTML =
        '<div class="card-top">' +
          '<h3 class="card-title">' + escapeHtml(d.decision) + "</h3>" +
          '<span class="badge ' + escapeHtml(d.status) + '">' + escapeHtml(d.status) + "</span>" +
        "</div>" +
        '<p class="card-context">' + escapeHtml(d.context || "") + "</p>" +
        '<div class="card-footer">' +
          '<span class="card-owner">' +
            '<span class="avatar" aria-hidden="true">' + escapeHtml(ownerInitial(d.owner)) + "</span>" +
            "<span>" + escapeHtml(d.owner || "Unassigned") + "</span>" +
          "</span>" +
          "<span>" + escapeHtml(formatDate(d.date)) + "</span>" +
        "</div>";

      card.addEventListener("click", function () { viewDecision(d.id); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          viewDecision(d.id);
        }
      });

      els.dashboard.appendChild(card);
    });
  }

  function ownerInitial(name) {
    var s = String(name || "").trim();
    return s ? s.charAt(0).toUpperCase() : "U";
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var toastTimer = null;

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.hidden = true;
    }, 2200);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
