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
      impact: "High",
      tags: ["Pricing", "Product", "Growth"],
      alternativesConsidered: "Considered dropping the price of the entry tier to $9/mo, or extending the trial from 14 to 30 days. Both were rejected because paywall friction was the core drop-off driver.",
      evidence: "Mixpanel funnel analysis: 84% user drop-off occurs at the credit card entry step during trial sign-up.",
      expectedOutcome: "Sign-up activation increases from 2% to 12% within two quarters; reach 5,000 monthly active seats.",
      reviewDate: "2026-10-15",
      actualOutcome: "Sign-ups grew 3.2x in the first 45 days. Activation rate reached 13.8%, surpassing the 12% benchmark.",
      supersedesId: null,
      supersededBy: null,
      createdAt: Date.now() - 50 * 24 * 60 * 60 * 1000
    },
    {
      id: "d2",
      decision: "Adopt React Native for the upcoming mobile app instead of native iOS + Android",
      context: "We need to ship a mobile experience in two quarters with a small mobile team. Stakeholders are split between native and cross-platform.",
      reasoning: "Single codebase maximizes output given team size, and most features are data-parallel UI, not compute-heavy. Shrinkage risk on native performance is acceptable for v1.",
      owner: "Priya Sharma",
      date: "2026-06-30",
      status: "Proposed",
      impact: "High",
      tags: ["Architecture", "Mobile", "Engineering"],
      alternativesConsidered: "Native iOS (Swift) + Android (Kotlin) separate codebases was evaluated, but requires hiring two dedicated mobile developers which is out of budget.",
      evidence: "Current team is 3 full-stack engineers fluent in TypeScript and React; 0 native Swift/Kotlin specialists.",
      expectedOutcome: "Ship unified iOS and Android beta to TestFlight within 16 weeks.",
      reviewDate: "2026-11-01",
      actualOutcome: "",
      supersedesId: null,
      supersededBy: null,
      createdAt: Date.now() - 68 * 24 * 60 * 60 * 1000
    },
    {
      id: "d3",
      decision: "Roll back the 2026 Q2 pricing change",
      context: "After the July price increase, net revenue retention dropped 6% and churn spiked among mid-market accounts.",
      reasoning: "The price increase targeted the wrong segment. Powwowing with sales confirmed mid-market was price-sensitive and the feature backbone wasn't in place. Reverting, then re-architecting pricing in Q4.",
      owner: "Marcus Lee",
      date: "2026-08-02",
      status: "Reversed",
      impact: "Critical",
      tags: ["Pricing", "Sales"],
      alternativesConsidered: "Grandfathering existing accounts while keeping higher pricing for new logos was considered, but created friction in the outbound pipeline.",
      evidence: "Mid-market account churn spiked by 8.4% in 30 days; 12 customer exit interviews cited pricing as sole departure reason.",
      expectedOutcome: "Halt mid-market renewal cancellations and stabilize revenue retention above 100%.",
      reviewDate: "2026-09-01",
      actualOutcome: "Churn stabilized within two weeks of rollback announcement; 4 churning accounts agreed to remain.",
      supersedesId: null,
      supersededBy: null,
      createdAt: Date.now() - 36 * 24 * 60 * 60 * 1000
    },
    {
      id: "d4",
      decision: "Prioritize dark mode and accessibility before the analytics dashboard",
      context: "Design system supports light theme only. Chrome extension of analytics team finds accessibility blockers in current UI.",
      reasoning: "Accessibility is a hard compliance need and dark mode drives engagement among power users. Both were repeatedly requested; stacking them now reduces future rework.",
      owner: "Sofia Reyes",
      date: "2026-08-10",
      status: "Decided",
      impact: "Medium",
      tags: ["UX", "Accessibility", "Design"],
      alternativesConsidered: "Shipping Analytics dashboard first and patching accessibility post-launch. Rejected because enterprise RFP compliance requires VPAT compliance now.",
      evidence: "Two enterprise prospect deals ($48k ARR) blocked pending WCAG 2.1 AA certification.",
      expectedOutcome: "Pass third-party WCAG audit with zero high-severity issues by end of August.",
      reviewDate: "2026-08-30",
      actualOutcome: "Audit completed August 28 with zero high-severity flags; both enterprise deals subsequently unblocked.",
      supersedesId: null,
      supersededBy: null,
      createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000
    }
  ];

  var state = {
    decisions: [],
    searchQuery: "",
    statusFilter: "all",
    viewMode: "cards",
    editingId: null,
    viewingId: null,
    supersedingId: null
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
    els.timelineDashboard = document.getElementById("timelineDashboard");
    els.emptyState = document.getElementById("emptyState");
    els.searchInput = document.getElementById("searchInput");
    els.statusFilter = document.getElementById("statusFilter");
    els.resultCount = document.getElementById("resultCount");

    els.stats = document.getElementById("stats");
    els.statTotalBox = document.getElementById("statTotalBox");
    els.statDecidedBox = document.getElementById("statDecidedBox");
    els.statProposedBox = document.getElementById("statProposedBox");
    els.statSupersededBox = document.getElementById("statSupersededBox");
    els.statReviewBox = document.getElementById("statReviewBox");

    els.statTotal = document.getElementById("statTotal");
    els.statDecided = document.getElementById("statDecided");
    els.statProposed = document.getElementById("statProposed");
    els.statSuperseded = document.getElementById("statSuperseded");
    els.statReview = document.getElementById("statReview");

    els.viewCardsBtn = document.getElementById("viewCardsBtn");
    els.viewTimelineBtn = document.getElementById("viewTimelineBtn");

    els.exportMenuBtn = document.getElementById("exportMenuBtn");
    els.exportMenu = document.getElementById("exportMenu");
    els.exportAdrBtn = document.getElementById("exportAdrBtn");
    els.exportJsonBtn = document.getElementById("exportJsonBtn");

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
    els.impactInput = document.getElementById("impactInput");

    els.toggleDeepFormBtn = document.getElementById("toggleDeepFormBtn");
    els.toggleDeepIcon = document.getElementById("toggleDeepIcon");
    els.deepFormFields = document.getElementById("deepFormFields");
    els.alternativesText = document.getElementById("alternativesText");
    els.evidenceText = document.getElementById("evidenceText");
    els.tagsInput = document.getElementById("tagsInput");
    els.reviewDateInput = document.getElementById("reviewDateInput");
    els.expectedOutcomeText = document.getElementById("expectedOutcomeText");
    els.actualOutcomeGroup = document.getElementById("actualOutcomeGroup");
    els.actualOutcomeText = document.getElementById("actualOutcomeText");

    els.detailModal = document.getElementById("detailModal");
    els.closeDetailBtn = document.getElementById("closeDetailBtn");
    els.deleteBtn = document.getElementById("deleteBtn");
    els.editBtn = document.getElementById("editBtn");
    els.supersedeBtn = document.getElementById("supersedeBtn");
    els.copyAdrBtn = document.getElementById("copyAdrBtn");

    els.detailTitle = document.getElementById("detailTitle");
    els.detailStatus = document.getElementById("detailStatus");
    els.detailImpact = document.getElementById("detailImpact");
    els.detailLineageBanner = document.getElementById("detailLineageBanner");
    els.detailOwner = document.getElementById("detailOwner");
    els.detailDate = document.getElementById("detailDate");
    els.detailTags = document.getElementById("detailTags");
    els.detailContext = document.getElementById("detailContext");
    els.detailReasoning = document.getElementById("detailReasoning");

    els.detailAlternativesSection = document.getElementById("detailAlternativesSection");
    els.detailAlternatives = document.getElementById("detailAlternatives");

    els.detailEvidenceSection = document.getElementById("detailEvidenceSection");
    els.detailEvidence = document.getElementById("detailEvidence");

    els.detailOutcomeSection = document.getElementById("detailOutcomeSection");
    els.detailReviewBadge = document.getElementById("detailReviewBadge");
    els.detailExpectedOutcome = document.getElementById("detailExpectedOutcome");
    els.detailReviewDate = document.getElementById("detailReviewDate");
    els.detailActualOutcome = document.getElementById("detailActualOutcome");
    els.quickOutcomeWrap = document.getElementById("quickOutcomeWrap");
    els.quickOutcomeInput = document.getElementById("quickOutcomeInput");
    els.quickOutcomeSaveBtn = document.getElementById("quickOutcomeSaveBtn");

    els.toast = document.getElementById("toast");
  }

  /* Safe Schema Normalization & Migration */
  function normalizeDecision(d) {
    if (!d || typeof d !== "object") return null;

    var decisionText = String(d.decision || d.title || "").trim();
    if (!decisionText) return null;

    var tags = [];
    if (Array.isArray(d.tags)) {
      tags = d.tags.map(function (t) { return String(t).trim(); }).filter(Boolean);
    } else if (typeof d.tags === "string" && d.tags.trim()) {
      tags = d.tags.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    }

    var validStatuses = ["Decided", "Proposed", "Superseded", "Reversed"];
    var status = validStatuses.indexOf(d.status) !== -1 ? d.status : "Decided";

    var validImpacts = ["Low", "Medium", "High", "Critical"];
    var impact = validImpacts.indexOf(d.impact) !== -1 ? d.impact : "Medium";

    return {
      id: d.id || uid(),
      decision: decisionText,
      context: String(d.context || "").trim(),
      reasoning: String(d.reasoning || "").trim(),
      owner: String(d.owner || "").trim(),
      date: d.date || new Date().toISOString().slice(0, 10),
      status: status,
      impact: impact,
      tags: tags,
      alternativesConsidered: String(d.alternativesConsidered || "").trim(),
      evidence: String(d.evidence || "").trim(),
      expectedOutcome: String(d.expectedOutcome || "").trim(),
      reviewDate: d.reviewDate || "",
      actualOutcome: String(d.actualOutcome || "").trim(),
      supersedesId: d.supersedesId || null,
      supersededBy: d.supersededBy || null,
      createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
      provenance: d.provenance || null
    };
  }

  function loadDecisions() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    var list = [];
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed.map(normalizeDecision).filter(Boolean);
        }
      } catch (e) {
        list = [];
      }
    }

    if (list.length === 0) {
      list = SAMPLE_DECISIONS.map(normalizeDecision).filter(Boolean);
      state.decisions = list;
      persist();
    } else {
      state.decisions = list;
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
    els.addDecisionBtn.addEventListener("click", function () { openNewModal(); });
    els.emptyAddBtn.addEventListener("click", function () { openNewModal(); });
    els.closeModalBtn.addEventListener("click", closeModal);
    els.cancelModalBtn.addEventListener("click", closeModal);
    els.closeDetailBtn.addEventListener("click", closeDetail);
    els.deleteBtn.addEventListener("click", deleteViewed);
    els.editBtn.addEventListener("click", editViewed);
    els.supersedeBtn.addEventListener("click", supersedeViewed);
    els.copyAdrBtn.addEventListener("click", copyAdrViewed);

    els.extractBtn.addEventListener("click", openExtract);
    els.closeExtractBtn.addEventListener("click", closeExtract);
    els.cancelExtractBtn.addEventListener("click", closeExtract);
    els.extractForm.addEventListener("submit", onExtractSubmit);
    els.extractBackBtn.addEventListener("click", resetExtractToInput);

    els.toggleDeepFormBtn.addEventListener("click", toggleDeepForm);
    els.quickOutcomeSaveBtn.addEventListener("click", saveQuickOutcome);

    els.viewCardsBtn.addEventListener("click", function () { setViewMode("cards"); });
    els.viewTimelineBtn.addEventListener("click", function () { setViewMode("timeline"); });

    // Interactive Stats filtering
    els.statTotalBox.addEventListener("click", function () { setFilter("all"); });
    els.statDecidedBox.addEventListener("click", function () { setFilter("Decided"); });
    els.statProposedBox.addEventListener("click", function () { setFilter("Proposed"); });
    els.statSupersededBox.addEventListener("click", function () { setFilter("Superseded"); });
    els.statReviewBox.addEventListener("click", function () { setFilter("needs_review"); });

    // Export Menu
    els.exportMenuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isHidden = els.exportMenu.hidden;
      els.exportMenu.hidden = !isHidden;
      els.exportMenuBtn.setAttribute("aria-expanded", String(!isHidden));
    });

    document.addEventListener("click", function () {
      if (els.exportMenu && !els.exportMenu.hidden) {
        els.exportMenu.hidden = true;
        els.exportMenuBtn.setAttribute("aria-expanded", "false");
      }
    });

    els.exportAdrBtn.addEventListener("click", exportAllAdrs);
    els.exportJsonBtn.addEventListener("click", exportJsonBackup);

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

  function setFilter(filterValue) {
    state.statusFilter = filterValue;
    els.statusFilter.value = filterValue;
    render();
  }

  function setViewMode(mode) {
    state.viewMode = mode;
    els.viewCardsBtn.classList.toggle("active", mode === "cards");
    els.viewTimelineBtn.classList.toggle("active", mode === "timeline");
    render();
  }

  function todayDefault() {
    els.dateInput.value = new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function toggleDeepForm(forceOpen) {
    var shouldOpen = typeof forceOpen === "boolean" ? forceOpen : els.deepFormFields.hidden;
    els.deepFormFields.hidden = !shouldOpen;
    els.toggleDeepIcon.textContent = shouldOpen ? "−" : "+";
  }

  function openNewModal(supersedingFromId) {
    state.editingId = null;
    state.supersedingId = supersedingFromId || null;

    els.modalTitle.textContent = state.supersedingId ? "Supersede Decision" : "Add Decision";
    els.decisionForm.reset();
    todayDefault();
    els.statusInput.value = "Decided";
    els.impactInput.value = "Medium";

    toggleDeepForm(false);

    if (state.supersedingId) {
      var predecessor = state.decisions.find(function (x) { return x.id === state.supersedingId; });
      if (predecessor) {
        els.contextText.value = "Supersedes earlier decision: \"" + predecessor.decision + "\".\n";
        toggleDeepForm(true);
      }
    }

    els.decisionModal.hidden = false;
    els.decisionText.focus();
  }

  function openEditModal(id) {
    var d = state.decisions.find(function (x) { return x.id === id; });
    if (!d) return;

    state.editingId = id;
    state.supersedingId = null;
    els.modalTitle.textContent = "Edit Decision";

    els.decisionText.value = d.decision || "";
    els.contextText.value = d.context || "";
    els.reasoningText.value = d.reasoning || "";
    els.ownerText.value = d.owner || "";
    els.dateInput.value = d.date || "";
    els.statusInput.value = d.status || "Decided";
    els.impactInput.value = d.impact || "Medium";

    els.alternativesText.value = d.alternativesConsidered || "";
    els.evidenceText.value = d.evidence || "";
    els.tagsInput.value = (d.tags || []).join(", ");
    els.reviewDateInput.value = d.reviewDate || "";
    els.expectedOutcomeText.value = d.expectedOutcome || "";
    els.actualOutcomeText.value = d.actualOutcome || "";

    var hasDeepData = Boolean(
      d.alternativesConsidered ||
      d.evidence ||
      (d.tags && d.tags.length) ||
      d.reviewDate ||
      d.expectedOutcome ||
      d.actualOutcome
    );

    toggleDeepForm(hasDeepData);

    closeDetail();
    els.decisionModal.hidden = false;
    els.decisionText.focus();
  }

  function closeModal() {
    els.decisionModal.hidden = true;
    state.editingId = null;
    state.supersedingId = null;
  }

  function onFormSubmit(e) {
    e.preventDefault();

    if (!els.decisionForm.checkValidity()) {
      els.decisionForm.reportValidity();
      return;
    }

    var tags = els.tagsInput.value
      .split(",")
      .map(function (t) { return t.trim(); })
      .filter(Boolean);

    var data = {
      decision: els.decisionText.value.trim(),
      context: els.contextText.value.trim(),
      reasoning: els.reasoningText.value.trim(),
      owner: els.ownerText.value.trim(),
      date: els.dateInput.value,
      status: els.statusInput.value,
      impact: els.impactInput.value,
      tags: tags,
      alternativesConsidered: els.alternativesText.value.trim(),
      evidence: els.evidenceText.value.trim(),
      reviewDate: els.reviewDateInput.value,
      expectedOutcome: els.expectedOutcomeText.value.trim(),
      actualOutcome: els.actualOutcomeText.value.trim()
    };

    if (state.editingId) {
      var existing = state.decisions.find(function (x) { return x.id === state.editingId; });
      if (existing) {
        Object.assign(existing, data);
        showToast("\u2713 Decision updated");
      }
    } else {
      data.id = uid();
      data.createdAt = Date.now();
      data.supersedesId = state.supersedingId || null;
      data.supersededBy = null;

      if (state.supersedingId) {
        var predecessor = state.decisions.find(function (x) { return x.id === state.supersedingId; });
        if (predecessor) {
          predecessor.status = "Superseded";
          predecessor.supersededBy = data.id;
        }
      }

      state.decisions.unshift(data);
      showToast(state.supersedingId ? "\u2713 Superseding decision created" : "\u2713 Decision saved to memory");
    }

    persist();
    closeModal();
    render();
  }

  /* Decision Memory Detail View (Answering the 6 core questions) */
  function viewDecision(id) {
    var d = state.decisions.find(function (x) { return x.id === id; });
    if (!d) return;

    state.viewingId = id;

    // 1. What did we decide?
    els.detailTitle.textContent = d.decision;
    els.detailStatus.textContent = d.status;
    els.detailStatus.className = "badge " + d.status;

    // Impact
    els.detailImpact.textContent = (d.impact || "Medium") + " Impact";
    els.detailImpact.className = "badge-impact " + (d.impact || "Medium");

    // 2. Who owns it & date
    els.detailOwner.textContent = "Owner: " + (d.owner || "Unassigned");
    els.detailDate.textContent = "Date: " + formatDate(d.date);

    // Tags
    els.detailTags.innerHTML = "";
    if (d.tags && d.tags.length) {
      d.tags.forEach(function (tag) {
        var pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.textContent = tag;
        els.detailTags.appendChild(pill);
      });
      els.detailTags.hidden = false;
    } else {
      els.detailTags.hidden = true;
    }

    // 3. Has this decision changed? (Lineage Banner)
    if (d.supersedesId) {
      var prev = state.decisions.find(function (x) { return x.id === d.supersedesId; });
      els.detailLineageBanner.innerHTML =
        "<span>\u21b3 Replaces earlier decision: " +
        '<span class="lineage-link" data-id="' + escapeHtml(d.supersedesId) + '">' +
        escapeHtml(prev ? prev.decision : "Previous Decision") +
        "</span></span>";
      els.detailLineageBanner.hidden = false;
    } else if (d.supersededBy) {
      var next = state.decisions.find(function (x) { return x.id === d.supersededBy; });
      els.detailLineageBanner.innerHTML =
        "<span>\u26a0 Superseded by: " +
        '<span class="lineage-link" data-id="' + escapeHtml(d.supersededBy) + '">' +
        escapeHtml(next ? next.decision : "Successor Decision") +
        "</span> (This decision is no longer active)</span>";
      els.detailLineageBanner.hidden = false;
    } else {
      els.detailLineageBanner.hidden = true;
      els.detailLineageBanner.innerHTML = "";
    }

    var lineageLinks = els.detailLineageBanner.querySelectorAll(".lineage-link");
    lineageLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        var targetId = link.getAttribute("data-id");
        if (targetId) viewDecision(targetId);
      });
    });

    // 4. Why did we decide it? (Context & Reasoning)
    els.detailContext.textContent = d.context || "No context recorded.";
    els.detailReasoning.textContent = d.reasoning || "No reasoning recorded.";

    // 5. What did we consider instead? (Alternatives)
    if (d.alternativesConsidered) {
      els.detailAlternatives.textContent = d.alternativesConsidered;
      els.detailAlternativesSection.hidden = false;
    } else {
      els.detailAlternativesSection.hidden = true;
    }

    // 6. What evidence supports it? (Evidence / Source)
    if (d.evidence) {
      els.detailEvidence.textContent = d.evidence;
      els.detailEvidenceSection.hidden = false;
    } else {
      els.detailEvidenceSection.hidden = true;
    }

    // 7. Did the decision actually work? (Revisit & Learn)
    var todayStr = new Date().toISOString().slice(0, 10);
    var isReviewDue = d.reviewDate && d.reviewDate <= todayStr && !d.actualOutcome;
    var isCompleted = Boolean(d.actualOutcome);

    if (isReviewDue) {
      els.detailReviewBadge.textContent = "Review Due";
      els.detailReviewBadge.className = "review-status-badge due";
    } else if (isCompleted) {
      els.detailReviewBadge.textContent = "Outcome Logged";
      els.detailReviewBadge.className = "review-status-badge completed";
    } else if (d.reviewDate) {
      els.detailReviewBadge.textContent = "Target: " + formatDate(d.reviewDate);
      els.detailReviewBadge.className = "review-status-badge";
    } else {
      els.detailReviewBadge.textContent = "Untracked";
      els.detailReviewBadge.className = "review-status-badge";
    }

    els.detailExpectedOutcome.textContent = d.expectedOutcome || "Not specified";
    els.detailReviewDate.textContent = d.reviewDate ? formatDate(d.reviewDate) : "None scheduled";

    if (d.actualOutcome) {
      els.detailActualOutcome.textContent = d.actualOutcome;
      els.detailActualOutcome.hidden = false;
      els.quickOutcomeWrap.hidden = true;
    } else {
      els.detailActualOutcome.textContent = "Pending revisit notes.";
      els.quickOutcomeInput.value = "";
      els.quickOutcomeWrap.hidden = false;
    }

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

    if (!confirm('Delete decision: "' + d.decision + '"?')) return;

    // Clean up lineage references
    state.decisions.forEach(function (item) {
      if (item.supersedesId === id) item.supersedesId = null;
      if (item.supersededBy === id) item.supersededBy = null;
    });

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

  function supersedeViewed() {
    if (state.viewingId) {
      var prevId = state.viewingId;
      closeDetail();
      openNewModal(prevId);
    }
  }

  function copyAdrViewed() {
    var id = state.viewingId;
    var d = state.decisions.find(function (x) { return x.id === id; });
    if (!d) return;

    var md = formatSingleAdr(d);
    navigator.clipboard.writeText(md).then(function () {
      showToast("ADR copied to clipboard");
    }).catch(function () {
      showToast("Could not copy to clipboard");
    });
  }

  function saveQuickOutcome() {
    var id = state.viewingId;
    var d = state.decisions.find(function (x) { return x.id === id; });
    if (!d) return;

    var outcome = els.quickOutcomeInput.value.trim();
    if (!outcome) {
      els.quickOutcomeInput.focus();
      return;
    }

    d.actualOutcome = outcome;
    persist();
    render();
    viewDecision(id);
    showToast("\u2713 Outcome & learnings recorded");
  }

  /* ADR & JSON Export */
  function formatSingleAdr(d) {
    var lines = [];
    lines.push("# " + (d.decision || "Untitled Decision"));
    lines.push("");
    lines.push("- **Status**: " + (d.status || "Decided"));
    lines.push("- **Date**: " + (d.date || ""));
    lines.push("- **Owner**: " + (d.owner || "Unassigned"));
    lines.push("- **Impact**: " + (d.impact || "Medium"));
    if (d.tags && d.tags.length) {
      lines.push("- **Tags**: " + d.tags.join(", "));
    }
    if (d.supersedesId) {
      var sPrev = state.decisions.find(function (x) { return x.id === d.supersedesId; });
      lines.push("- **Supersedes**: " + (sPrev ? sPrev.decision : d.supersedesId));
    }
    if (d.supersededBy) {
      var sNext = state.decisions.find(function (x) { return x.id === d.supersededBy; });
      lines.push("- **Superseded By**: " + (sNext ? sNext.decision : d.supersededBy));
    }
    lines.push("");
    lines.push("## Context & Problem");
    lines.push(d.context || "None specified.");
    lines.push("");
    lines.push("## Decision & Reasoning");
    lines.push(d.reasoning || "None specified.");
    lines.push("");
    if (d.alternativesConsidered) {
      lines.push("## Alternatives Considered");
      lines.push(d.alternativesConsidered);
      lines.push("");
    }
    if (d.evidence) {
      lines.push("## Supporting Evidence / Source");
      lines.push("> " + d.evidence.replace(/\n/g, "\n> "));
      lines.push("");
    }
    if (d.expectedOutcome || d.actualOutcome || d.reviewDate) {
      lines.push("## Revisit & Outcomes");
      if (d.expectedOutcome) lines.push("- **Expected Outcome**: " + d.expectedOutcome);
      if (d.reviewDate) lines.push("- **Target Review Date**: " + d.reviewDate);
      if (d.actualOutcome) lines.push("- **Actual Outcome & Learnings**: " + d.actualOutcome);
      lines.push("");
    }
    return lines.join("\n");
  }

  function exportAllAdrs() {
    els.exportMenu.hidden = true;
    var list = getFiltered();
    if (list.length === 0) {
      showToast("No decisions to export");
      return;
    }

    var content = list.map(formatSingleAdr).join("\n\n---\n\n");
    downloadFile(content, "decision-records-" + new Date().toISOString().slice(0, 10) + ".md", "text/markdown");
    showToast("Exported " + list.length + " ADRs");
  }

  function exportJsonBackup() {
    els.exportMenu.hidden = true;
    var backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      decisions: state.decisions
    };
    var content = JSON.stringify(backup, null, 2);
    downloadFile(content, "decision-log-backup-" + new Date().toISOString().slice(0, 10) + ".json", "application/json");
    showToast("Memory backup downloaded");
  }

  function downloadFile(content, filename, contentType) {
    var blob = new Blob([content], { type: contentType + ";charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* Extract from Text (Confirmation & Correction Flow) */
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
    if (on) {
      els.extractRunBtn.classList.add("btn-loading");
      els.extractRunBtn.setAttribute("aria-busy", "true");
      els.extractRunBtn.setAttribute("aria-label", "Extracting decisions from text…");
    } else {
      els.extractRunBtn.classList.remove("btn-loading");
      els.extractRunBtn.removeAttribute("aria-busy");
      els.extractRunBtn.removeAttribute("aria-label");
      els.extractRunBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>' +
        'Extract to Memory';
    }
  }

  function onExtractSubmit(e) {
    e.preventDefault();

    var text = els.extractText.value.trim();
    if (!text) {
      setExtractError("Please paste discussion or notes to extract from.");
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
          err.friendly = "Extraction request failed. Verify the server is running with GEMINI_API_KEY configured.";
          throw err;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.decisions)) {
          var err = new Error("shape");
          err.friendly = "Extraction returned an unexpected format. Please try again.";
          throw err;
        }
        showExtractResults(data.decisions);
      })
      .catch(function (err) {
        setExtractError((err && err.friendly) || "Could not reach extraction service. Please check connection.");
      })
      .then(function () {
        setExtractLoading(false);
      });
  }

  function showExtractResults(decisions) {
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
    els.extractTitle.textContent = "Review & Confirm (" + decisions.length + ")";
  }

  function cleanStr(v) {
    return v === null || v === undefined ? "" : String(v).trim();
  }

  function getProvBadgeHtml(prov, field) {
    if (!prov || !prov[field]) return "";
    var val = prov[field];
    if (val === "stated") {
      return '<span class="prov-pill stated" title="Directly stated in source text">Stated</span>';
    }
    if (val === "inferred") {
      return '<span class="prov-pill inferred" title="Strongly inferred from conversation context">Inferred</span>';
    }
    return "";
  }

  function buildReviewCard(d, index) {
    var today = new Date().toISOString().slice(0, 10);
    var prov = d.provenance || {};

    var card = document.createElement("div");
    card.className = "review-card";

    var tagsStr = Array.isArray(d.tags) ? d.tags.join(", ") : cleanStr(d.tags);

    var html =
      '<div class="review-card-head">' +
        '<span class="review-card-index">Decision #' + index + "</span>" +
        '<span class="review-card-status">' + (d.status || "Decided") + "</span>" +
      "</div>" +

      // Decision Title
      '<div class="form-group">' +
        '<label>Decision ' + getProvBadgeHtml(prov, "title") + '</label>' +
        '<input type="text" class="rw-title" required value="' + escapeHtml(cleanStr(d.title || d.decision)) + '">' +
      "</div>" +

      // Context
      '<div class="form-group">' +
        '<label>Context / Problem ' + getProvBadgeHtml(prov, "context") + '</label>' +
        '<textarea class="rw-context" rows="2">' + escapeHtml(cleanStr(d.context)) + "</textarea>" +
      "</div>" +

      // Reasoning
      '<div class="form-group">' +
        '<label>Reasoning ' + getProvBadgeHtml(prov, "reasoning") + '</label>' +
        '<textarea class="rw-reasoning" rows="2">' + escapeHtml(cleanStr(d.reasoning)) + "</textarea>" +
      "</div>" +

      // Owner & Date
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Owner ' + getProvBadgeHtml(prov, "owner") + '</label>' +
          '<input type="text" class="rw-owner" value="' + escapeHtml(cleanStr(d.owner)) + '">' +
        "</div>" +
        '<div class="form-group">' +
          '<label>Date</label>' +
          '<input type="date" class="rw-date" value="' + escapeHtml(d.date || today) + '">' +
        "</div>" +
      "</div>" +

      // Status & Impact
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Status</label>' +
          '<select class="rw-status">' +
            '<option value="Decided"' + (d.status === "Decided" ? " selected" : "") + '>Decided</option>' +
            '<option value="Proposed"' + (d.status === "Proposed" ? " selected" : "") + '>Proposed</option>' +
          "</select>" +
        "</div>" +
        '<div class="form-group">' +
          '<label>Impact ' + getProvBadgeHtml(prov, "impact") + '</label>' +
          '<select class="rw-impact">' +
            '<option value="Low"' + (d.impact === "Low" ? " selected" : "") + '>Low</option>' +
            '<option value="Medium"' + (!d.impact || d.impact === "Medium" ? " selected" : "") + '>Medium</option>' +
            '<option value="High"' + (d.impact === "High" ? " selected" : "") + '>High</option>' +
            '<option value="Critical"' + (d.impact === "Critical" ? " selected" : "") + '>Critical</option>' +
          "</select>" +
        "</div>" +
      "</div>";

    // Alternatives Considered (if found)
    if (d.alternativesConsidered) {
      html +=
        '<div class="form-group">' +
          '<label>What we considered instead ' + getProvBadgeHtml(prov, "alternativesConsidered") + '</label>' +
          '<textarea class="rw-alternatives" rows="2">' + escapeHtml(cleanStr(d.alternativesConsidered)) + "</textarea>" +
        "</div>";
    }

    // Evidence / Source Quote (Preserves exact transcript snippet)
    if (d.evidence) {
      html +=
        '<div class="form-group">' +
          '<label>Supporting Evidence / Source Quote</label>' +
          '<blockquote class="review-evidence-quote">' + escapeHtml(cleanStr(d.evidence)) + "</blockquote>" +
          '<input type="hidden" class="rw-evidence" value="' + escapeHtml(cleanStr(d.evidence)) + '">' +
        "</div>";
    }

    // Expected Outcome & Review Date (if found)
    if (d.expectedOutcome || d.reviewDate) {
      html +=
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label>Expected Outcome ' + getProvBadgeHtml(prov, "expectedOutcome") + '</label>' +
            '<input type="text" class="rw-expected-outcome" value="' + escapeHtml(cleanStr(d.expectedOutcome)) + '">' +
          "</div>" +
          '<div class="form-group">' +
            '<label>Suggested Review Date</label>' +
            '<input type="date" class="rw-review-date" value="' + escapeHtml(cleanStr(d.reviewDate)) + '">' +
          "</div>" +
        "</div>";
    }

    // Tags
    html +=
      '<div class="form-group">' +
        '<label>Tags</label>' +
        '<input type="text" class="rw-tags" value="' + escapeHtml(tagsStr) + '" placeholder="e.g. Architecture, Pricing">' +
      "</div>" +

      '<div class="review-card-actions">' +
        '<button type="button" class="btn btn-ghost rw-discard">Discard</button>' +
        '<button type="button" class="btn btn-primary rw-save">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
          "Save to Memory" +
        "</button>" +
      "</div>";

    card.innerHTML = html;

    card.querySelector(".rw-save").addEventListener("click", function () {
      var titleEl = card.querySelector(".rw-title");
      if (!titleEl.value.trim()) {
        titleEl.focus();
        return;
      }

      var altEl = card.querySelector(".rw-alternatives");
      var evEl = card.querySelector(".rw-evidence");
      var expEl = card.querySelector(".rw-expected-outcome");
      var revDateEl = card.querySelector(".rw-review-date");
      var tagsEl = card.querySelector(".rw-tags");

      var tags = [];
      if (tagsEl && tagsEl.value.trim()) {
        tags = tagsEl.value.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
      }

      var data = {
        id: uid(),
        decision: titleEl.value.trim(),
        context: card.querySelector(".rw-context").value.trim(),
        reasoning: card.querySelector(".rw-reasoning").value.trim(),
        owner: card.querySelector(".rw-owner").value.trim(),
        date: card.querySelector(".rw-date").value,
        status: card.querySelector(".rw-status").value,
        impact: card.querySelector(".rw-impact").value,
        tags: tags,
        alternativesConsidered: altEl ? altEl.value.trim() : "",
        evidence: evEl ? evEl.value.trim() : "",
        expectedOutcome: expEl ? expEl.value.trim() : "",
        reviewDate: revDateEl ? revDateEl.value : "",
        actualOutcome: "",
        supersedesId: null,
        supersededBy: null,
        createdAt: Date.now(),
        provenance: prov
      };

      state.decisions.unshift(data);
      persist();
      render();
      showToast("\u2713 Saved to organizational memory");
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
    closeExtract();
  }

  /* Search & Filter Engine */
  function getFiltered() {
    var q = state.searchQuery.toLowerCase();
    var filter = state.statusFilter;
    var todayStr = new Date().toISOString().slice(0, 10);

    return state.decisions.filter(function (d) {
      var matchesStatus = true;
      if (filter === "needs_review") {
        matchesStatus = Boolean(d.reviewDate && d.reviewDate <= todayStr && !d.actualOutcome);
      } else if (filter !== "all") {
        matchesStatus = d.status === filter;
      }

      var matchesSearch = q === "" ||
        (d.decision && d.decision.toLowerCase().indexOf(q) !== -1) ||
        (d.context && d.context.toLowerCase().indexOf(q) !== -1) ||
        (d.reasoning && d.reasoning.toLowerCase().indexOf(q) !== -1) ||
        (d.owner && d.owner.toLowerCase().indexOf(q) !== -1) ||
        (d.alternativesConsidered && d.alternativesConsidered.toLowerCase().indexOf(q) !== -1) ||
        (d.evidence && d.evidence.toLowerCase().indexOf(q) !== -1) ||
        (d.actualOutcome && d.actualOutcome.toLowerCase().indexOf(q) !== -1) ||
        (d.tags && d.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; }));

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

  function countNeedsReview() {
    var todayStr = new Date().toISOString().slice(0, 10);
    return state.decisions.reduce(function (n, d) {
      return (d.reviewDate && d.reviewDate <= todayStr && !d.actualOutcome) ? n + 1 : n;
    }, 0);
  }

  function updateActiveStat() {
    var f = state.statusFilter;
    els.statTotalBox.classList.toggle("stat-active", f === "all");
    els.statDecidedBox.classList.toggle("stat-active", f === "Decided");
    els.statProposedBox.classList.toggle("stat-active", f === "Proposed");
    els.statSupersededBox.classList.toggle("stat-active", f === "Superseded");
    els.statReviewBox.classList.toggle("stat-active", f === "needs_review");
  }

  function render() {
    var list = getFiltered();

    els.resultCount.textContent = list.length + (list.length === 1 ? " decision" : " decisions");

    els.statTotal.textContent = state.decisions.length;
    els.statDecided.textContent = countByStatus("Decided");
    els.statProposed.textContent = countByStatus("Proposed");
    els.statSuperseded.textContent = countByStatus("Superseded");
    els.statReview.textContent = countNeedsReview();

    updateActiveStat();

    if (state.decisions.length === 0) {
      els.dashboard.hidden = true;
      els.timelineDashboard.hidden = true;
      els.emptyState.hidden = false;
      els.stats.hidden = true;
      return;
    }

    els.emptyState.hidden = true;
    els.stats.hidden = false;

    if (state.viewMode === "timeline") {
      els.dashboard.hidden = true;
      els.timelineDashboard.hidden = false;
      renderTimeline(list);
    } else {
      els.timelineDashboard.hidden = true;
      els.dashboard.hidden = false;
      renderCards(list);
    }
  }

  function renderCards(list) {
    els.dashboard.innerHTML = "";
    var todayStr = new Date().toISOString().slice(0, 10);

    list.forEach(function (d) {
      var card = document.createElement("article");
      card.className = "card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "View decision: " + d.decision);

      var isReviewDue = d.reviewDate && d.reviewDate <= todayStr && !d.actualOutcome;

      var tagsHtml = "";
      if (d.tags && d.tags.length) {
        tagsHtml = '<div class="card-tags">' +
          d.tags.slice(0, 3).map(function (t) {
            return '<span class="tag-pill">' + escapeHtml(t) + "</span>";
          }).join("") +
          (d.tags.length > 3 ? '<span class="tag-pill">+' + (d.tags.length - 3) + "</span>" : "") +
          "</div>";
      }

      var lineageHint = "";
      if (d.supersedesId) {
        lineageHint = '<div style="font-size:11.5px;color:#7c3aed;font-weight:600;">\u21b3 Replaces earlier decision</div>';
      } else if (d.supersededBy) {
        lineageHint = '<div style="font-size:11.5px;color:#94a3b8;font-weight:600;">\u26a0 Superseded by newer decision</div>';
      }

      var reviewHint = "";
      if (isReviewDue) {
        reviewHint = '<span class="review-status-badge due" style="font-size:10.5px;">Review Due</span>';
      } else if (d.actualOutcome) {
        reviewHint = '<span class="review-status-badge completed" style="font-size:10.5px;">Learnings Logged</span>';
      }

      card.innerHTML =
        '<div class="card-top">' +
          '<h3 class="card-title">' + escapeHtml(d.decision) + "</h3>" +
          '<div style="display:flex;gap:5px;flex-shrink:0;">' +
            '<span class="badge ' + escapeHtml(d.status) + '">' + escapeHtml(d.status) + "</span>" +
          "</div>" +
        "</div>" +
        lineageHint +
        '<p class="card-context">' + escapeHtml(d.context || "") + "</p>" +
        tagsHtml +
        '<div class="card-footer">' +
          '<span class="card-owner">' +
            '<span class="avatar" aria-hidden="true">' + escapeHtml(ownerInitial(d.owner)) + "</span>" +
            "<span>" + escapeHtml(d.owner || "Unassigned") + "</span>" +
          "</span>" +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            reviewHint +
            '<span class="badge-impact ' + escapeHtml(d.impact || "Medium") + '" style="font-size:10.5px;">' + escapeHtml(d.impact || "Medium") + "</span>" +
            "<span>" + escapeHtml(formatDate(d.date)) + "</span>" +
          "</div>" +
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

  function renderTimeline(list) {
    els.timelineDashboard.innerHTML = "";

    // Group decisions by Year-Month
    var sorted = list.slice().sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    });

    var groups = {};
    sorted.forEach(function (d) {
      var key = d.date ? d.date.slice(0, 7) : "Undated";
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });

    Object.keys(groups).forEach(function (monthKey) {
      var groupDiv = document.createElement("div");
      groupDiv.className = "timeline-group";

      var milestoneTitle = monthKey === "Undated" ? "Undated Decisions" : formatMonthKey(monthKey);
      groupDiv.innerHTML = '<div class="timeline-milestone">\u25c8 ' + escapeHtml(milestoneTitle) + "</div>";

      groups[monthKey].forEach(function (d) {
        var item = document.createElement("div");
        item.className = "timeline-item";

        var card = document.createElement("div");
        card.className = "timeline-card";
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");

        var tagsHtml = (d.tags || []).map(function (t) {
          return '<span class="tag-pill">' + escapeHtml(t) + "</span>";
        }).join(" ");

        card.innerHTML =
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px;">' +
            '<h3 style="font-size:15px;font-weight:700;color:var(--text);line-height:1.35;">' + escapeHtml(d.decision) + "</h3>" +
            '<span class="badge ' + escapeHtml(d.status) + '">' + escapeHtml(d.status) + "</span>" +
          "</div>" +
          '<p style="font-size:13px;color:var(--text-soft);margin-bottom:10px;line-height:1.5;">' + escapeHtml(d.context || "") + "</p>" +
          (tagsHtml ? '<div style="margin-bottom:10px;">' + tagsHtml + "</div>" : "") +
          '<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-muted);border-top:1px solid rgba(140,158,196,0.2);padding-top:8px;">' +
            '<span>Owner: <strong style="color:var(--text-soft);">' + escapeHtml(d.owner || "Unassigned") + "</strong></span>" +
            '<span>' + escapeHtml(formatDate(d.date)) + "</span>" +
          "</div>";

        card.addEventListener("click", function () { viewDecision(d.id); });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            viewDecision(d.id);
          }
        });

        item.innerHTML = '<span class="timeline-node" aria-hidden="true"></span>';
        item.appendChild(card);
        groupDiv.appendChild(item);
      });

      els.timelineDashboard.appendChild(groupDiv);
    });
  }

  function formatMonthKey(key) {
    var parts = key.split("-");
    if (parts.length < 2) return key;
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
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
    }, 2400);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
