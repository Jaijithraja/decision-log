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

    els.addDecisionBtn = document.getElementById("addDecisionBtn");
    els.emptyAddBtn = document.getElementById("emptyAddBtn");

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
        }
      }
    });

    [els.decisionModal, els.detailModal].forEach(function (overlay) {
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

  function render() {
    var list = getFiltered();

    els.resultCount.textContent = list.length + (list.length === 1 ? " decision" : " decisions");

    if (state.decisions.length === 0) {
      els.dashboard.hidden = true;
      els.emptyState.hidden = false;
      return;
    }

    els.emptyState.hidden = true;
    els.dashboard.hidden = false;

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
          '<span class="card-owner">' + escapeHtml(d.owner || "Unassigned") + "</span>" +
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
