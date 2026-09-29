(function () {
  "use strict";

  var STORAGE_KEY = "decisionLog.decisions.v1";
  var LINK_TYPES = {
    depends_on: "Depends on",
    influenced_by: "Influenced by",
    related_to: "Related to",
    contradicts: "Contradicts"
  };

  var WALKTHROUGH_STORAGE_KEY = "lore.walkthroughSeen";

  var WALKTHROUGH_STEPS = [
    {
      step: 1,
      tag: "Step 1 of 3",
      title: "Paste any conversation",
      copy: "A Slack thread, WhatsApp export, meeting notes, or email. LORE reads it, not you.",
      visual: '<svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="25" y="10" width="170" height="100" rx="14" fill="#FFFFFF" fill-opacity="0.85" stroke="#D3E2F8" stroke-width="1.2"/>' +
        '<rect x="38" y="22" width="115" height="24" rx="8" fill="#EEF4FF" stroke="#D8E5FC"/>' +
        '<circle cx="50" cy="34" r="5" fill="#5B8DEF"/>' +
        '<rect x="62" y="30" width="75" height="4" rx="2" fill="#8AA8E8"/>' +
        '<rect x="62" y="37" width="48" height="3" rx="1.5" fill="#B4C9F4"/>' +
        '<rect x="68" y="52" width="115" height="28" rx="8" fill="#5B8DEF" fill-opacity="0.12" stroke="#4F7DF2" stroke-width="1.2"/>' +
        '<circle cx="80" cy="66" r="5" fill="#9E92F7"/>' +
        '<rect x="92" y="61" width="76" height="4.5" rx="2" fill="#2563EB"/>' +
        '<rect x="92" y="69" width="52" height="3.5" rx="1.5" fill="#4B77E8"/>' +
        '<rect x="38" y="87" width="42" height="14" rx="4" fill="#E2EDFD"/>' +
        '<text x="59" y="97" font-family="sans-serif" font-size="8" font-weight="700" fill="#2563EB" text-anchor="middle">SLACK</text>' +
        '<rect x="85" y="87" width="42" height="14" rx="4" fill="#EBE9FE"/>' +
        '<text x="106" y="97" font-family="sans-serif" font-size="8" font-weight="700" fill="#7C3AED" text-anchor="middle">MEET</text>' +
        '<rect x="132" y="87" width="42" height="14" rx="4" fill="#E0F2FE"/>' +
        '<text x="153" y="97" font-family="sans-serif" font-size="8" font-weight="700" fill="#0284C7" text-anchor="middle">EMAIL</text>' +
      '</svg>'
    },
    {
      step: 2,
      tag: "Step 2 of 3",
      title: "LORE finds what was actually decided",
      copy: "Skips the back-and-forth, keeps the final call, the reasoning, and who owns it.",
      visual: '<svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<image href="assets/brand/lore-symbol-mark.png" x="14" y="28" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>' +
        '<path d="M84 60 H96 M92 56 L96 60 L92 64" stroke="#5B8DEF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<rect x="100" y="15" width="104" height="90" rx="12" fill="#FFFFFF" fill-opacity="0.92" stroke="#CFE0FA" stroke-width="1.2"/>' +
        '<rect x="108" y="23" width="44" height="12" rx="4" fill="#E8F8F0"/>' +
        '<text x="130" y="32" font-family="sans-serif" font-size="7.5" font-weight="750" fill="#087A55" text-anchor="middle">DECIDED</text>' +
        '<rect x="108" y="41" width="76" height="5" rx="2" fill="#0F172A"/>' +
        '<rect x="108" y="49" width="54" height="4" rx="2" fill="#64748B"/>' +
        '<rect x="108" y="60" width="88" height="16" rx="4" fill="#F4F8FE"/>' +
        '<rect x="112" y="66" width="76" height="3.5" rx="1.5" fill="#3B82F6"/>' +
        '<text x="112" y="93" font-family="sans-serif" font-size="7" font-weight="600" fill="#94A3B8">OWNER: ALEX</text>' +
      '</svg>'
    },
    {
      step: 3,
      tag: "Step 3 of 3",
      title: "Review, then save",
      copy: "You always confirm before anything is added to memory. Nothing saves automatically.",
      visual: '<svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="32" y="12" width="156" height="96" rx="14" fill="#FFFFFF" fill-opacity="0.95" stroke="#CFE0FA" stroke-width="1.2"/>' +
        '<circle cx="50" cy="32" r="9" fill="#10B981" fill-opacity="0.15"/>' +
        '<circle cx="50" cy="32" r="6" fill="#10B981"/>' +
        '<path d="M47.5 32 L49.5 34 L53 30" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<text x="66" y="36" font-family="sans-serif" font-size="10.5" font-weight="800" fill="#0F172A">Human Verified</text>' +
        '<rect x="44" y="48" width="132" height="5" rx="2" fill="#1E293B"/>' +
        '<rect x="44" y="56" width="102" height="4" rx="2" fill="#64748B"/>' +
        '<rect x="44" y="68" width="132" height="24" rx="7" fill="#2563EB"/>' +
        '<text x="110" y="83" font-family="sans-serif" font-size="9" font-weight="700" fill="#FFFFFF" text-anchor="middle">✓ Save to Memory</text>' +
      '</svg>'
    }
  ];

  var state = {
    decisions: [],
    searchQuery: "",
    statusFilter: "all",
    viewMode: "cards",
    editingId: null,
    viewingId: null,
    supersedingId: null,
    walkthroughStep: 0,
    askRequestId: 0
  };

  var els = {};

  function init() {
    cacheElements();
    loadDecisions();
    bindEvents();
    todayDefault();
    render();
    checkInitialRoute();
    initTypewriter();
    initLandingDemo();
    initCloudWatchEyes();
  }

  function cacheElements() {
    els.dashboard = document.getElementById("dashboard");
    els.timelineDashboard = document.getElementById("timelineDashboard");
    els.emptyState = document.getElementById("emptyState");
    els.toolbar = document.querySelector(".toolbar");
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
    els.importJsonBtn = document.getElementById("importJsonBtn");
    els.emptyImportBtn = document.getElementById("emptyImportBtn");
    els.importJsonFile = document.getElementById("importJsonFile");

    els.howItWorksBtn = document.getElementById("howItWorksBtn");
    els.addDecisionBtn = document.getElementById("addDecisionBtn");
    els.emptyAddBtn = document.getElementById("emptyAddBtn");
    els.emptyExtractBtn = document.getElementById("emptyExtractBtn");

    // Landing screen elements
    els.landingScreen = document.getElementById("landingScreen");
    els.appContainer = document.getElementById("appContainer");
    els.landingTryBtn = document.getElementById("landingTryBtn");
    els.landingBottomTryBtn = document.getElementById("landingBottomTryBtn");
    els.landingGoDashboardBtn = document.getElementById("landingGoDashboardBtn");
    els.appBrandLink = document.getElementById("appBrandLink");
    els.introViewBtn = document.getElementById("introViewBtn");

    // Walkthrough modal elements
    els.walkthroughModal = document.getElementById("walkthroughModal");
    els.wtStepBadge = document.getElementById("wtStepBadge");
    els.wtVisual = document.getElementById("wtVisual");
    els.wtHeadline = document.getElementById("wtHeadline");
    els.wtCopy = document.getElementById("wtCopy");
    els.wtDots = document.querySelectorAll(".wt-dot");
    els.wtBackBtn = document.getElementById("wtBackBtn");
    els.wtNextBtn = document.getElementById("wtNextBtn");
    els.wtNextBtnText = document.getElementById("wtNextBtnText");
    els.wtNextBtnIcon = document.getElementById("wtNextBtnIcon");
    els.wtSkipBtn = document.getElementById("wtSkipBtn");
    els.wtCloseBtn = document.getElementById("wtCloseBtn");

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
    els.detailLinksList = document.getElementById("detailLinksList");
    els.detailLinkForm = document.getElementById("detailLinkForm");
    els.detailLinkType = document.getElementById("detailLinkType");
    els.detailLinkTarget = document.getElementById("detailLinkTarget");
    els.detailImpactBtn = document.getElementById("detailImpactBtn");

    els.detailOutcomeSection = document.getElementById("detailOutcomeSection");
    els.detailReviewBadge = document.getElementById("detailReviewBadge");
    els.detailExpectedOutcome = document.getElementById("detailExpectedOutcome");
    els.detailReviewDate = document.getElementById("detailReviewDate");
    els.detailActualOutcome = document.getElementById("detailActualOutcome");
    els.quickOutcomeWrap = document.getElementById("quickOutcomeWrap");
    els.quickOutcomeInput = document.getElementById("quickOutcomeInput");
    els.quickOutcomeSaveBtn = document.getElementById("quickOutcomeSaveBtn");

    els.toast = document.getElementById("toast");

    // Ask Lore elements
    els.headerAskLoreBtn = document.getElementById("headerAskLoreBtn");
    els.askLoreSection = document.getElementById("askLoreSection");
    els.askLoreForm = document.getElementById("askLoreForm");
    els.askLoreInput = document.getElementById("askLoreInput");
    els.askLoreSubmitBtn = document.getElementById("askLoreSubmitBtn");
    els.askLoreSuggestions = document.getElementById("askLoreSuggestions");
    els.askLoreResultPanel = document.getElementById("askLoreResultPanel");
    els.askResultQuestion = document.getElementById("askResultQuestion");
    els.askResultResetBtn = document.getElementById("askResultResetBtn");
    els.askResultLoading = document.getElementById("askResultLoading");
    els.askResultAnswerBox = document.getElementById("askResultAnswerBox");
    els.askResultAnswerText = document.getElementById("askResultAnswerText");
    els.askResultSources = document.getElementById("askResultSources");
    els.askResultNoMemory = document.getElementById("askResultNoMemory");
    els.askResultError = document.getElementById("askResultError");
    els.askCaptureBtn = document.getElementById("askCaptureBtn");
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
    var links = Array.isArray(d.links) ? d.links.reduce(function (result, link) {
      if (!link || !Object.prototype.hasOwnProperty.call(LINK_TYPES, link.type)) return result;
      var targetId = String(link.targetId || "");
      if (!targetId || targetId === d.id || result.some(function (saved) {
        return saved.targetId === targetId && saved.type === link.type;
      })) return result;
      result.push({ targetId: targetId, type: link.type });
      return result;
    }, []) : [];

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
      links: links,
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

    // Clear legacy placeholder seed decisions (d1, d2, d3, d4)
    var isLegacySeeds = list.length > 0 && list.every(function (d) {
      return ["d1", "d2", "d3", "d4"].indexOf(d.id) !== -1;
    });
    if (isLegacySeeds) {
      list = [];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      } catch (e) {}
    }

    var demoTitles = [
      "Move the onboarding paywall to appear after the second completed project",
      "Prioritize dark mode and accessibility before the analytics dashboard"
    ];
    var savedCount = list.length;
    list = list.filter(function (decision) {
      return demoTitles.indexOf(decision.decision) === -1;
    });
    var validIds = new Set(list.map(function (decision) { return decision.id; }));
    list.forEach(function (decision) {
      decision.links = decision.links.filter(function (link) { return validIds.has(link.targetId); });
    });
    if (list.length !== savedCount) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (e) {}
    }

    state.decisions = list;
  }

  function persist() {
    state.askRequestId++;
    if (els.askLoreResultPanel) els.askLoreResultPanel.hidden = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.decisions));
    } catch (e) {
      showToast("Could not save: storage unavailable");
    }
  }

  /* First-time Onboarding Walkthrough */
  function showWalkthroughStep(index) {
    if (index < 0 || index >= WALKTHROUGH_STEPS.length) return;
    state.walkthroughStep = index;
    var stepData = WALKTHROUGH_STEPS[index];

    if (els.wtStepBadge) els.wtStepBadge.textContent = stepData.tag;
    if (els.wtHeadline) els.wtHeadline.textContent = stepData.title;
    if (els.wtCopy) els.wtCopy.textContent = stepData.copy;
    if (els.wtVisual) els.wtVisual.innerHTML = stepData.visual;

    if (els.wtDots) {
      els.wtDots.forEach(function (dot, i) {
        if (i === index) {
          dot.classList.add("active");
          dot.setAttribute("aria-selected", "true");
        } else {
          dot.classList.remove("active");
          dot.setAttribute("aria-selected", "false");
        }
      });
    }

    if (els.wtBackBtn) {
      els.wtBackBtn.style.visibility = index === 0 ? "hidden" : "visible";
    }

    if (els.wtNextBtnText) {
      if (index === WALKTHROUGH_STEPS.length - 1) {
        els.wtNextBtnText.textContent = "Get started";
        if (els.wtNextBtn) els.wtNextBtn.classList.add("btn-finish");
        if (els.wtNextBtnIcon) {
          els.wtNextBtnIcon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
        }
      } else {
        els.wtNextBtnText.textContent = "Next";
        if (els.wtNextBtn) els.wtNextBtn.classList.remove("btn-finish");
        if (els.wtNextBtnIcon) {
          els.wtNextBtnIcon.innerHTML = '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>';
        }
      }
    }
  }

  function openWalkthrough(startStep) {
    showWalkthroughStep(typeof startStep === "number" ? startStep : 0);
    if (els.walkthroughModal) els.walkthroughModal.hidden = false;
  }

  function closeWalkthrough(markSeen) {
    if (els.walkthroughModal) els.walkthroughModal.hidden = true;
    if (markSeen) {
      try {
        localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
      } catch (e) {}
    }
  }

  function enterDashboard(andOpenExtract, prefill) {
    if (els.landingScreen) els.landingScreen.hidden = true;
    if (els.appContainer) els.appContainer.hidden = false;
    window.location.hash = "app";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (andOpenExtract) {
      setTimeout(function () {
        openExtract(prefill);
      }, 100);
    }
  }

  function showLanding() {
    if (els.landingScreen) els.landingScreen.hidden = false;
    if (els.appContainer) els.appContainer.hidden = true;
    history.replaceState(null, null, " ");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkInitialRoute() {
    var hash = window.location.hash.toLowerCase();
    if (hash === "#app" || hash === "#dashboard") {
      enterDashboard(false);
    } else {
      showLanding();
    }
  }

  function initTypewriter() {
    var textEl = document.getElementById("typewriterText");
    var cursorEl = document.getElementById("typewriterCursor");
    if (!textEl) return;

    var phrases = [
      "why.",
      "decisions.",
      "reasoning.",
      "who owns it.",
      "context."
    ];

    var speed = 70;
    var waitTime = 1500;
    var deleteSpeed = 40;
    var phraseIdx = 0;
    var charIdx = phrases[0].length;
    var isDeleting = true;

    function step() {
      var current = phrases[phraseIdx];

      if (isDeleting) {
        if (charIdx > 0) {
          charIdx--;
          textEl.textContent = current.slice(0, charIdx);
          setTimeout(step, deleteSpeed);
        } else {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(step, 200);
        }
      } else {
        if (charIdx < current.length) {
          charIdx++;
          textEl.textContent = current.slice(0, charIdx);
          setTimeout(step, speed);
        } else {
          isDeleting = true;
          setTimeout(step, waitTime);
        }
      }
    }

    setTimeout(step, waitTime);
  }

  function initLandingDemo() {
    // Keep subtle hover interaction for visual cards if present
    document.querySelectorAll(".loop-step-card, .visual-card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", x + "px");
        card.style.setProperty("--mouse-y", y + "px");
      });
    });
  }

  function initCloudWatchEyes() {
    var pupilLeft = document.getElementById("cloudPupilLeft");
    var pupilRight = document.getElementById("cloudPupilRight");
    if (!pupilLeft || !pupilRight) return;

    var cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    function updateEyes() {
      var offsetX = ((cursor.x / Math.max(window.innerWidth, 1)) - 0.5) * 22;
      var offsetY = ((cursor.y / Math.max(window.innerHeight, 1)) - 0.5) * 8;
      var transform = "translate(" + offsetX.toFixed(1) + "px, " + offsetY.toFixed(1) + "px)";
      pupilLeft.style.transform = transform;
      pupilRight.style.transform = transform;
    }

    window.addEventListener("mousemove", function (e) {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      updateEyes();
    }, { passive: true });

    // Blink every 3 seconds
    setInterval(function () {
      var eyes = document.querySelectorAll(".cloud-eye");
      if (!eyes.length) return;
      eyes.forEach(function (eye) { eye.classList.add("blinking"); });
      setTimeout(function () {
        eyes.forEach(function (eye) { eye.classList.remove("blinking"); });
      }, 190);
    }, 3000);

    // Typing behavior (squint/close when user is typing anywhere in form/inputs)
    document.addEventListener("focusin", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
        document.querySelectorAll(".cloud-eye").forEach(function (eye) { eye.classList.add("typing"); });
      }
    });

    document.addEventListener("focusout", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
        document.querySelectorAll(".cloud-eye").forEach(function (eye) { eye.classList.remove("typing"); });
      }
    });

    updateEyes();
  }

  function checkFirstTimeWalkthrough() {
    var seen = false;
    try {
      seen = localStorage.getItem(WALKTHROUGH_STORAGE_KEY) === "true";
    } catch (e) {
      seen = false;
    }
    if (!seen) {
      openWalkthrough(0);
    }
  }

  function bindEvents() {
    if (els.landingTryBtn) {
      els.landingTryBtn.addEventListener("click", function () {
        els.landingTryBtn.setAttribute("data-state", "clicked");
        setTimeout(function () {
          els.landingTryBtn.removeAttribute("data-state");
        }, 200);
        enterDashboard(true);
      });
    }

    if (els.landingBottomTryBtn) {
      els.landingBottomTryBtn.addEventListener("click", function () {
        els.landingBottomTryBtn.setAttribute("data-state", "clicked");
        setTimeout(function () {
          els.landingBottomTryBtn.removeAttribute("data-state");
        }, 200);
        enterDashboard(true);
      });
    }

    if (els.landingGoDashboardBtn) {
      els.landingGoDashboardBtn.addEventListener("click", function () {
        enterDashboard(false);
      });
    }

    if (els.appBrandLink) {
      els.appBrandLink.addEventListener("click", function (e) {
        e.preventDefault();
        showLanding();
      });
    }

    if (els.introViewBtn) {
      els.introViewBtn.addEventListener("click", function () {
        showLanding();
      });
    }
    if (els.howItWorksBtn) {
      els.howItWorksBtn.addEventListener("click", function () {
        openWalkthrough(0);
      });
    }

    els.addDecisionBtn.addEventListener("click", function () { openNewModal(); });
    els.emptyAddBtn.addEventListener("click", function () { openNewModal(); });
    if (els.emptyExtractBtn) {
      els.emptyExtractBtn.addEventListener("click", openExtract);
    }

    // Walkthrough controls
    if (els.wtBackBtn) {
      els.wtBackBtn.addEventListener("click", function () {
        if (state.walkthroughStep > 0) {
          showWalkthroughStep(state.walkthroughStep - 1);
        }
      });
    }

    if (els.wtNextBtn) {
      els.wtNextBtn.addEventListener("click", function () {
        if (state.walkthroughStep < WALKTHROUGH_STEPS.length - 1) {
          showWalkthroughStep(state.walkthroughStep + 1);
        } else {
          closeWalkthrough(true);
        }
      });
    }

    if (els.wtSkipBtn) {
      els.wtSkipBtn.addEventListener("click", function () {
        closeWalkthrough(true);
      });
    }

    if (els.wtCloseBtn) {
      els.wtCloseBtn.addEventListener("click", function () {
        closeWalkthrough(true);
      });
    }

    if (els.wtDots) {
      els.wtDots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          var stepIdx = parseInt(dot.getAttribute("data-step"), 10);
          if (!isNaN(stepIdx)) showWalkthroughStep(stepIdx);
        });
      });
    }

    els.closeModalBtn.addEventListener("click", closeModal);
    els.cancelModalBtn.addEventListener("click", closeModal);
    els.closeDetailBtn.addEventListener("click", closeDetail);
    els.deleteBtn.addEventListener("click", deleteViewed);
    els.editBtn.addEventListener("click", editViewed);
    els.supersedeBtn.addEventListener("click", supersedeViewed);
    els.copyAdrBtn.addEventListener("click", copyAdrViewed);
    els.detailLinkForm.addEventListener("submit", addDecisionLink);
    els.detailImpactBtn.addEventListener("click", askImpactOfViewed);

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
    els.importJsonBtn.addEventListener("click", openJsonImport);
    els.emptyImportBtn.addEventListener("click", openJsonImport);
    els.importJsonFile.addEventListener("change", importJsonBackup);

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
        if (els.walkthroughModal && !els.walkthroughModal.hidden) {
          closeWalkthrough(true);
        } else if (!els.detailModal.hidden) {
          closeDetail();
        } else if (!els.decisionModal.hidden) {
          closeModal();
        } else if (!els.extractModal.hidden) {
          closeExtract();
        }
      }
    });

    [els.decisionModal, els.detailModal, els.extractModal, els.walkthroughModal].forEach(function (overlay) {
      if (!overlay) return;
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
          if (overlay === els.walkthroughModal) {
            closeWalkthrough(true);
          } else {
            overlay.hidden = true;
          }
        }
      });
    });

    // Header Ask Lore shortcut
    if (els.headerAskLoreBtn) {
      els.headerAskLoreBtn.addEventListener("click", function () {
        if (els.landingScreen && !els.landingScreen.hidden) {
          enterDashboard(false);
        }
        if (els.askLoreSection) {
          els.askLoreSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (els.askLoreInput) {
          setTimeout(function () {
            els.askLoreInput.focus();
          }, 250);
        }
      });
    }

    // Ask Lore Form Submission
    if (els.askLoreForm) {
      els.askLoreForm.addEventListener("submit", onAskLoreSubmit);
    }

    if (els.askLoreSuggestions) {
      els.askLoreSuggestions.addEventListener("click", function (event) {
        var chip = event.target.closest(".ask-chip");
        if (chip && els.askLoreSuggestions.contains(chip)) {
          submitAskLoreQuery(chip.getAttribute("data-q"), chip.getAttribute("data-impact-id"));
        }
      });
    }

    // Reset / Clear button
    if (els.askResultResetBtn) {
      els.askResultResetBtn.addEventListener("click", resetAskLore);
    }

    // Capture conversation CTA from No-Memory state
    if (els.askCaptureBtn) {
      els.askCaptureBtn.addEventListener("click", function () {
        openExtract();
      });
    }
  }

  /* ==========================================================================
     ASK LORE DECISION INTELLIGENCE
     ========================================================================== */

  function onAskLoreSubmit(e) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    var query = els.askLoreInput ? els.askLoreInput.value.trim() : "";
    submitAskLoreQuery(query);
  }

  function resetAskLore() {
    state.askRequestId++;
    if (els.askLoreResultPanel) {
      els.askLoreResultPanel.hidden = true;
    }
    if (els.askLoreInput) {
      els.askLoreInput.value = "";
      els.askLoreInput.focus();
    }
  }

  function showAskNoMemory() {
    if (els.askResultLoading) els.askResultLoading.hidden = true;
    if (els.askResultAnswerBox) els.askResultAnswerBox.hidden = true;
    if (els.askResultError) els.askResultError.hidden = true;
    if (els.askResultNoMemory) els.askResultNoMemory.hidden = false;
  }

  function showAskError(message) {
    if (els.askResultLoading) els.askResultLoading.hidden = true;
    if (els.askResultAnswerBox) els.askResultAnswerBox.hidden = true;
    if (els.askResultNoMemory) els.askResultNoMemory.hidden = true;
    if (els.askResultError) {
      els.askResultError.textContent = message;
      els.askResultError.hidden = false;
    }
  }

  function renderAskSuggestions() {
    if (!els.askLoreSuggestions) return;
    els.askLoreSuggestions.replaceChildren();
    var suggestions = [];
    var linkedDecision = state.decisions.map(function (decision) {
      return { decision: decision, affectedCount: getAffectedDecisions(decision.id).length };
    }).sort(function (first, second) { return second.affectedCount - first.affectedCount; })[0];
    if (linkedDecision && linkedDecision.affectedCount > 0) {
      suggestions.push('What could change if "' + linkedDecision.decision.decision + '" changes?');
    }
    state.decisions.slice(0, 5).forEach(function (decision) {
      var title = decision.decision;
      suggestions.push(decision.reasoning || decision.context
        ? 'Why was "' + title + '" decided?'
        : 'What was decided about "' + title + '"?');
      if (decision.owner) suggestions.push('Who owns "' + title + '"?');
      if (decision.alternativesConsidered) suggestions.push('What alternatives were considered for "' + title + '"?');
    });

    suggestions.slice(0, 5).forEach(function (question, index) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ask-chip";
      chip.textContent = question;
      chip.setAttribute("data-q", question);
      if (index === 0 && linkedDecision && linkedDecision.affectedCount > 0) {
        chip.setAttribute("data-impact-id", linkedDecision.decision.id);
      }
      els.askLoreSuggestions.appendChild(chip);
    });
  }

  /* Tokenize & score candidate decisions from memory */
  function findRelevantDecisions(rawQuery) {
    if (!state.decisions || !state.decisions.length) return [];

    var q = String(rawQuery || "").toLowerCase().trim();
    if (!q) return [];

    var stopWords = [
      "a", "about", "above", "after", "again", "all", "an", "and", "any", "are", "as", "at",
      "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
      "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
      "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
      "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me", "more",
      "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
      "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
      "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
      "then", "there", "these", "they", "this", "those", "through", "to", "too", "under",
      "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while",
      "who", "whom", "why", "will", "with", "would", "you", "your", "yours", "yourself",
      "yourselves", "decide", "decided", "decision", "decisions", "choose", "chose", "choice",
      "team", "make", "made", "owner", "owns", "alternative", "alternatives",
      "considered", "review", "due", "need", "needs", "affect", "affected",
      "impact", "change", "changes", "changing", "happen", "break"
    ];

    var cleanWords = q.replace(/[^a-z0-9_\-\s]/g, " ").split(/\s+/).filter(Boolean);
    var contentTokens = cleanWords.filter(function (w) {
      return w.length > 1 && stopWords.indexOf(w) === -1;
    });

    var wantsReview = q.indexOf("review") !== -1 || q.indexOf("due") !== -1 || q.indexOf("evaluat") !== -1;
    var wantsAlternatives = q.indexOf("alternative") !== -1 || q.indexOf("option") !== -1 || q.indexOf("consider") !== -1;
    var wantsOwner = q.indexOf("who") !== -1 || q.indexOf("owner") !== -1 || q.indexOf("owns") !== -1 || q.indexOf("lead") !== -1;

    var synonymExpansions = [];
    if (q.indexOf("postgres") !== -1 || q.indexOf("postgresql") !== -1 || q.indexOf("database") !== -1 || q.indexOf("db") !== -1 || q.indexOf("sql") !== -1) {
      synonymExpansions.push("postgres", "postgresql", "database", "db", "sql");
    }
    if (q.indexOf("pricing") !== -1 || q.indexOf("billing") !== -1 || q.indexOf("price") !== -1 || q.indexOf("cost") !== -1 || q.indexOf("subscription") !== -1) {
      synonymExpansions.push("pricing", "billing", "price", "cost", "tier", "subscription");
    }

    var allTokens = Array.from(new Set(contentTokens.concat(synonymExpansions)));

    if (!allTokens.length && !wantsReview && !wantsAlternatives) {
      if (state.viewingId) {
        var viewed = state.decisions.find(function (d) { return d.id === state.viewingId; });
        if (viewed) return [viewed];
      }
      return [];
    }

    var todayStr = new Date().toISOString().slice(0, 10);
    var scored = state.decisions.map(function (d) {
      var score = 0;
      var titleLower = (d.decision || "").toLowerCase();
      var contextLower = (d.context || "").toLowerCase();
      var reasoningLower = (d.reasoning || "").toLowerCase();
      var ownerLower = (d.owner || "").toLowerCase();
      var tagsLower = (Array.isArray(d.tags) ? d.tags.join(" ") : String(d.tags || "")).toLowerCase();
      var altLower = (d.alternativesConsidered || "").toLowerCase();
      var evidenceLower = (d.evidence || "").toLowerCase();
      var outcomeLower = (d.expectedOutcome || "").toLowerCase() + " " + (d.actualOutcome || "").toLowerCase();

      // Score exact user content tokens with high priority
      contentTokens.forEach(function (token) {
        if (!token) return;
        if (titleLower.indexOf(token) !== -1) score += 20;
        if (tagsLower.indexOf(token) !== -1) score += 15;
        if (reasoningLower.indexOf(token) !== -1) score += 10;
        if (evidenceLower.indexOf(token) !== -1) score += 9;
        if (contextLower.indexOf(token) !== -1) score += 8;
        if (altLower.indexOf(token) !== -1) score += 8;
        if (outcomeLower.indexOf(token) !== -1) score += 5;
        if (ownerLower.indexOf(token) !== -1) score += 12;
      });

      // Secondary synonym expansions have lower weight
      synonymExpansions.forEach(function (syn) {
        if (!syn || contentTokens.indexOf(syn) !== -1) return;
        if (titleLower.indexOf(syn) !== -1) score += 4;
        if (tagsLower.indexOf(syn) !== -1) score += 3;
        if (reasoningLower.indexOf(syn) !== -1) score += 3;
        if (contextLower.indexOf(syn) !== -1) score += 2;
      });

      var dueForReview = d.reviewDate && d.reviewDate <= todayStr && !d.actualOutcome;
      if (!allTokens.length) {
        if (wantsReview && dueForReview) score += 25;
        if (wantsAlternatives && d.alternativesConsidered) score += 15;
      } else if (score > 0) {
        if (wantsReview && dueForReview) score += 10;
        if (wantsAlternatives && d.alternativesConsidered) score += 5;
        if (wantsOwner && d.owner) score += 5;
      }

      return { decision: d, score: score };
    });

    scored.sort(function (a, b) { return b.score - a.score; });
    var positive = scored.filter(function (item) { return item.score > 0; }).map(function (item) { return item.decision; });

    if (positive.length > 0) {
      return positive.slice(0, 6);
    }

    return [];
  }

  function getAffectedDecisions(targetId) {
    var visited = new Set([targetId]);
    var queue = [{ id: targetId, path: [targetId], types: [] }];
    var affected = [];
    while (queue.length) {
      var current = queue.shift();
      state.decisions.forEach(function (decision) {
        if (visited.has(decision.id)) return;
        var link = (decision.links || []).find(function (item) {
          return item.targetId === current.id && (item.type === "depends_on" || item.type === "influenced_by");
        });
        if (!link) return;
        visited.add(decision.id);
        var path = current.path.concat(decision.id);
        var types = current.types.concat(link.type);
        affected.push({ decision: decision, path: path, types: types });
        queue.push({ id: decision.id, path: path, types: types });
      });
    }
    return affected;
  }

  function isImpactQuestion(query) {
    return /\b(?:what|which)\b.*\b(?:affect|affected|impact|break)\b|\bif\b.*\bchang(?:e|es|ed|ing)\b/i.test(query);
  }

  function findImpactTarget(query, explicitId) {
    if (explicitId) {
      return state.decisions.find(function (decision) { return decision.id === explicitId; }) || null;
    }
    var quoted = query.match(/["“]([^"”]+)["”]/);
    if (quoted) {
      return state.decisions.find(function (decision) {
        return decision.decision.toLowerCase() === quoted[1].toLowerCase();
      }) || null;
    }
    if (state.viewingId) {
      return state.decisions.find(function (decision) { return decision.id === state.viewingId; }) || null;
    }
    var candidates = findRelevantDecisions(query);
    return candidates.length === 1 ? candidates[0] : null;
  }

  function showImpactAnswer(target) {
    var affected = getAffectedDecisions(target.id);
    var answer = affected.length
      ? affected.length + (affected.length === 1 ? " linked decision may" : " linked decisions may") +
        ' need review if "' + target.decision + '" changes. These are recorded dependency or influence paths, not predicted outcomes.'
      : 'No decisions are recorded as depending on or influenced by "' + target.decision + '" yet. This does not prove there is no impact.';
    var sources = [{ decisionId: target.id, title: target.decision, why: target.reasoning, evidence: target.evidence }];
    affected.forEach(function (item) {
      var path = item.path.map(function (id) {
        var decision = state.decisions.find(function (record) { return record.id === id; });
        return decision ? decision.decision : "Unknown decision";
      });
      var steps = item.types.map(function (type, index) {
        return path[index + 1] + " " + LINK_TYPES[type].toLowerCase() + " " + path[index];
      });
      sources.push({
        decisionId: item.decision.id,
        title: item.decision.decision,
        why: "Linked path: " + steps.join("; ") + (item.decision.reasoning ? ". " + item.decision.reasoning : ""),
        evidence: item.decision.evidence
      });
    });
    if (els.askResultLoading) els.askResultLoading.hidden = true;
    if (els.askResultAnswerBox) els.askResultAnswerBox.hidden = false;
    if (els.askResultAnswerText) els.askResultAnswerText.textContent = answer;
    renderAskSources(sources);
  }

  function submitAskLoreQuery(query, impactId) {
    var q = String(query || "").trim();
    if (!q) {
      if (els.askLoreInput) els.askLoreInput.focus();
      return;
    }

    if (els.askLoreInput) {
      els.askLoreInput.value = q;
    }
    var requestId = ++state.askRequestId;

    // Display result panel and loading indicator
    if (els.askLoreResultPanel) els.askLoreResultPanel.hidden = false;
    if (els.askResultQuestion) els.askResultQuestion.textContent = q;
    if (els.askResultLoading) els.askResultLoading.hidden = false;
    if (els.askResultAnswerBox) els.askResultAnswerBox.hidden = true;
    if (els.askResultNoMemory) els.askResultNoMemory.hidden = true;
    if (els.askResultError) els.askResultError.hidden = true;
    if (els.askResultSources) els.askResultSources.innerHTML = "";

    try {
      if (els.askLoreResultPanel) {
        els.askLoreResultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } catch (err) {}

    // Check if team memory has any decisions
    if (!state.decisions || !state.decisions.length) {
      showAskNoMemory();
      return;
    }

    if (isImpactQuestion(q)) {
      var target = findImpactTarget(q, impactId);
      if (target) showImpactAnswer(target);
      else showAskNoMemory();
      return;
    }

    var candidates = findRelevantDecisions(q);
    if (!candidates.length) {
      showAskNoMemory();
      return;
    }

    fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        records: candidates
      })
    })
      .then(async function (res) {
        var data = null;
        try {
          data = await res.json();
        } catch (parseErr) {
          throw new Error("Unable to parse Ask Lore response");
        }
        if (!res.ok) {
          var serverErr = (data && data.error) || ("HTTP " + res.status);
          throw new Error(serverErr);
        }
        return data;
      })
      .then(function (data) {
        if (requestId !== state.askRequestId) return;
        if (els.askResultLoading) els.askResultLoading.hidden = true;
        if (!data || !data.answerable || !data.answer) {
          showAskNoMemory();
          return;
        }

        if (els.askResultAnswerBox) els.askResultAnswerBox.hidden = false;
        if (els.askResultAnswerText) els.askResultAnswerText.textContent = data.answer;
        renderAskSources(data.sources || []);
      })
      .catch(function (err) {
        if (requestId !== state.askRequestId) return;
        console.warn("Ask Lore API error:", err);
        var msg = (err && err.message) || "";
        if (msg.indexOf("GEMINI_API_KEY") !== -1 || msg.indexOf("API key") !== -1) {
          showToast("Gemini API key is not configured on the server.");
        }
        showAskError("Ask Lore couldn't answer right now. Please try again.");
      });
  }

  function renderAskSources(sources) {
    if (!els.askResultSources) return;
    els.askResultSources.innerHTML = "";
    if (!Array.isArray(sources) || !sources.length) return;

    sources.forEach(function (src) {
      var card = document.createElement("div");
      card.className = "ask-source-card";

      // Match against stored memory to provide precise deep linking and metadata
      var matched = state.decisions.find(function (d) {
        return d.id === src.decisionId || (src.title && d.decision.toLowerCase() === src.title.toLowerCase());
      });

      var decisionId = matched ? matched.id : src.decisionId;
      var title = (matched && matched.decision) || src.title || "Decision Record";
      var whyText = src.why || (matched && matched.reasoning) || "";
      var evidenceText = src.evidence || (matched && matched.evidence) || "";

      var sourceMeta = src.source;
      if (!sourceMeta && matched) {
        var authorPart = matched.owner || "Team";
        var datePart = matched.date ? formatDate(matched.date) : "";
        sourceMeta = datePart ? authorPart + " · " + datePart : authorPart;
      }
      if (!sourceMeta) {
        sourceMeta = "Lore Decision Memory";
      }

      var provenance = String(src.provenance || "stated").toLowerCase().indexOf("infer") !== -1 ? "inferred" : "stated";
      var provenanceLabel = provenance === "inferred" ? "Inferred" : "Stated";

      var html =
        '<div class="ask-source-header">' +
          '<div class="ask-source-meta-left">' +
            '<span class="ask-source-label">DECISION</span>' +
          '</div>' +
          '<span class="provenance-pill ' + provenance + '">' + provenanceLabel + '</span>' +
        '</div>' +
        '<h4 class="ask-source-title">' + escapeHtml(title) + '</h4>' +
        (whyText ? (
          '<div class="ask-source-why-label">WHY</div>' +
          '<p class="ask-source-why">' + escapeHtml(whyText) + '</p>'
        ) : '') +
        (evidenceText ? (
          '<div class="ask-source-evidence-label">EVIDENCE</div>' +
          '<blockquote class="ask-source-evidence">&ldquo;' + escapeHtml(evidenceText) + '&rdquo;</blockquote>'
        ) : '') +
        '<div class="ask-source-footer">' +
          '<span class="ask-source-meta"><strong>SOURCE:</strong> ' + escapeHtml(sourceMeta) + '</span>' +
          (decisionId ? (
            '<button type="button" class="ask-source-view-btn" data-id="' + escapeHtml(decisionId) + '">' +
              '<span>View decision</span>' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>' +
            '</button>'
          ) : '') +
        '</div>';

      card.innerHTML = html;

      var viewBtn = card.querySelector(".ask-source-view-btn");
      if (viewBtn && decisionId) {
        viewBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          viewDecision(decisionId);
        });
      }

      var titleEl = card.querySelector(".ask-source-title");
      if (titleEl && decisionId) {
        titleEl.addEventListener("click", function () {
          viewDecision(decisionId);
        });
      }

      els.askResultSources.appendChild(card);
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
      data.links = [];

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

  function wouldCreateDependencyCycle(sourceId, targetId) {
    var seen = new Set();
    var queue = [targetId];
    while (queue.length) {
      var id = queue.shift();
      if (id === sourceId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      var decision = state.decisions.find(function (item) { return item.id === id; });
      if (!decision) continue;
      (decision.links || []).forEach(function (link) {
        if (link.type === "depends_on" || link.type === "influenced_by") queue.push(link.targetId);
      });
    }
    return false;
  }

  function renderDecisionLinks(decision) {
    els.detailLinksList.replaceChildren();
    var entries = [];
    (decision.links || []).forEach(function (link) {
      var target = state.decisions.find(function (item) { return item.id === link.targetId; });
      if (target) entries.push({ target: target, type: LINK_TYPES[link.type], removable: link });
    });
    state.decisions.forEach(function (item) {
      if (item.id === decision.id) return;
      (item.links || []).forEach(function (link) {
        if (link.targetId !== decision.id) return;
        var reverseLabel = {
          depends_on: "Depended on by",
          influenced_by: "Influences",
          related_to: "Related to",
          contradicts: "Contradicted by"
        };
        entries.push({ target: item, type: reverseLabel[link.type] });
      });
    });
    if (decision.supersedesId) {
      var predecessor = state.decisions.find(function (item) { return item.id === decision.supersedesId; });
      if (predecessor) entries.push({ target: predecessor, type: "Supersedes" });
    }
    if (decision.supersededBy) {
      var successor = state.decisions.find(function (item) { return item.id === decision.supersededBy; });
      if (successor) entries.push({ target: successor, type: "Superseded by" });
    }

    if (!entries.length) {
      var empty = document.createElement("span");
      empty.className = "detail-links-empty";
      empty.textContent = "No decisions linked yet.";
      els.detailLinksList.appendChild(empty);
    }

    entries.forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "detail-link-row";
      var type = document.createElement("span");
      type.className = "detail-link-type";
      type.textContent = entry.type;
      var view = document.createElement("button");
      view.type = "button";
      view.className = "detail-link-view";
      view.textContent = entry.target.decision;
      view.addEventListener("click", function () { viewDecision(entry.target.id); });
      row.appendChild(type);
      row.appendChild(view);
      if (entry.removable) {
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "detail-link-remove";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", "Remove link to " + entry.target.decision);
        remove.addEventListener("click", function () {
          decision.links = decision.links.filter(function (link) {
            return link !== entry.removable;
          });
          persist();
          renderDecisionLinks(decision);
          render();
          showToast("Decision link removed");
        });
        row.appendChild(remove);
      }
      els.detailLinksList.appendChild(row);
    });

    els.detailLinkForm.hidden = state.decisions.length < 2;
    els.detailLinkTarget.replaceChildren();
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a decision";
    els.detailLinkTarget.appendChild(placeholder);
    state.decisions.forEach(function (item) {
      if (item.id === decision.id) return;
      var option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.decision;
      els.detailLinkTarget.appendChild(option);
    });
  }

  function addDecisionLink(event) {
    event.preventDefault();
    var decision = state.decisions.find(function (item) { return item.id === state.viewingId; });
    var targetId = els.detailLinkTarget.value;
    var type = els.detailLinkType.value;
    var target = state.decisions.find(function (item) { return item.id === targetId; });
    if (!decision || !target || targetId === decision.id || !Object.prototype.hasOwnProperty.call(LINK_TYPES, type)) return;
    if ((decision.links || []).some(function (link) { return link.targetId === targetId && link.type === type; }) ||
        (type === "related_to" && (target.links || []).some(function (link) {
          return link.targetId === decision.id && link.type === type;
        }))) {
      showToast("That link already exists");
      return;
    }
    if ((type === "depends_on" || type === "influenced_by") && wouldCreateDependencyCycle(decision.id, targetId)) {
      showToast("That link would create a dependency cycle");
      return;
    }
    if (!decision.links) decision.links = [];
    decision.links.push({ targetId: targetId, type: type });
    persist();
    renderDecisionLinks(decision);
    render();
    showToast("Decision linked");
  }

  function askImpactOfViewed() {
    var decision = state.decisions.find(function (item) { return item.id === state.viewingId; });
    if (!decision) return;
    closeDetail();
    submitAskLoreQuery('What could change if "' + decision.decision + '" changes?', decision.id);
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
    renderDecisionLinks(d);

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
      item.links = (item.links || []).filter(function (link) { return link.targetId !== id; });
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
    if (d.links && d.links.length) {
      lines.push("## Linked Decisions");
      d.links.forEach(function (link) {
        var target = state.decisions.find(function (item) { return item.id === link.targetId; });
        if (target) lines.push("- **" + LINK_TYPES[link.type] + "**: " + target.decision);
      });
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
      format: "lore-decision-graph",
      version: 2,
      exportedAt: new Date().toISOString(),
      decisions: state.decisions
    };
    var content = JSON.stringify(backup, null, 2);
    downloadFile(content, "lore-graph-backup-" + new Date().toISOString().slice(0, 10) + ".json", "application/json");
    showToast("Graph backup downloaded");
  }

  function openJsonImport() {
    els.exportMenu.hidden = true;
    els.exportMenuBtn.setAttribute("aria-expanded", "false");
    els.importJsonFile.value = "";
    els.importJsonFile.click();
  }

  function prepareGraphImport(backup) {
    if (!backup || typeof backup !== "object" || Array.isArray(backup) ||
        !Array.isArray(backup.decisions) ||
        !((backup.version === 1 && !backup.format) ||
          (backup.version === 2 && backup.format === "lore-decision-graph"))) {
      throw new Error("Not a supported LORE graph backup");
    }

    var importedIds = new Set();
    var imported = backup.decisions.map(function (raw) {
      if (!raw || typeof raw.id !== "string" || !raw.id.trim() ||
          typeof raw.decision !== "string" || !raw.decision.trim() || importedIds.has(raw.id)) {
        throw new Error("Backup contains an invalid or duplicate decision");
      }
      importedIds.add(raw.id);
      if (raw.links !== undefined && !Array.isArray(raw.links)) {
        throw new Error("Backup contains invalid decision links");
      }
      (raw.links || []).forEach(function (link) {
        if (!link || typeof link.targetId !== "string" ||
            !Object.prototype.hasOwnProperty.call(LINK_TYPES, link.type) || link.targetId === raw.id) {
          throw new Error("Backup contains invalid decision links");
        }
      });
      return normalizeDecision(raw);
    });

    var existingIds = new Set(state.decisions.map(function (decision) { return decision.id; }));
    var added = imported.filter(function (decision) { return !existingIds.has(decision.id); });
    var combined = state.decisions.concat(added);
    var graph = new Map(combined.map(function (decision) { return [decision.id, decision]; }));
    added.forEach(function (decision) {
      decision.links.forEach(function (link) {
        if (!graph.has(link.targetId)) throw new Error("Backup has a link to a missing decision");
      });
      if ((decision.supersedesId && !graph.has(decision.supersedesId)) ||
          (decision.supersededBy && !graph.has(decision.supersededBy))) {
        throw new Error("Backup has a superseded link to a missing decision");
      }
    });

    var visiting = new Set();
    var visited = new Set();
    function visit(id) {
      if (visiting.has(id)) throw new Error("Backup would create a dependency cycle");
      if (visited.has(id)) return;
      visiting.add(id);
      (graph.get(id).links || []).forEach(function (link) {
        if ((link.type === "depends_on" || link.type === "influenced_by") && graph.has(link.targetId)) visit(link.targetId);
      });
      visiting.delete(id);
      visited.add(id);
    }
    combined.forEach(function (decision) { visit(decision.id); });
    return { combined: combined, added: added.length, skipped: imported.length - added.length };
  }

  async function importJsonBackup() {
    var file = els.importJsonFile.files[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Backup is too large (10 MB maximum)");
      var backup = JSON.parse(await file.text());
      var result = prepareGraphImport(backup);
      if (!result.added) {
        showToast("No new decisions to import" + (result.skipped ? " (" + result.skipped + " already here)" : ""));
        return;
      }
      var message = "Import " + result.added + " decisions and their graph links? Existing decisions will be kept.";
      if (result.skipped) message += " " + result.skipped + " matching IDs will be skipped.";
      if (!window.confirm(message)) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.combined));
      state.decisions = result.combined;
      state.askRequestId++;
      if (els.askLoreResultPanel) els.askLoreResultPanel.hidden = true;
      render();
      showToast("Imported " + result.added + " decisions" + (result.skipped ? "; skipped " + result.skipped + " existing" : ""));
    } catch (error) {
      showToast(error instanceof SyntaxError ? "Invalid JSON backup" :
        error.name === "QuotaExceededError" ? "Not enough browser storage; nothing was imported" :
        (error.message || "Could not import backup"));
    } finally {
      els.importJsonFile.value = "";
    }
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
  function openExtract(prefill) {
    resetExtractToInput();
    if (typeof prefill === "string" && prefill.trim()) {
      els.extractText.value = prefill.trim();
    }
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
      .then(async function (res) {
        var data = null;
        try {
          data = await res.json();
        } catch (parseErr) {
          var err = new Error("Invalid response");
          err.friendly = "Extraction service unavailable";
          throw err;
        }

        if (!res.ok) {
          var serverErr = (data && data.error) || "";
          var code = data && data.code;
          var err = new Error(serverErr || ("HTTP " + res.status));

          if (code === "MISSING_API_KEY" || (res.status === 500 && serverErr.toLowerCase().includes("api key"))) {
            err.friendly = "Server is not configured with GEMINI_API_KEY.";
          } else if (code === "INVALID_RESPONSE" || code === "MALFORMED_RESPONSE" || serverErr.toLowerCase().includes("non-json")) {
            err.friendly = "Invalid Gemini response";
          } else if (code === "UPSTREAM_FAILED" || serverErr.toLowerCase().includes("gemini api request failed") || serverErr.toLowerCase().includes("llm request failed")) {
            err.friendly = serverErr || "Gemini API request failed";
          } else if (serverErr) {
            err.friendly = serverErr;
          } else {
            err.friendly = "Extraction request failed (HTTP " + res.status + ")";
          }
          throw err;
        }

        return data;
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.decisions)) {
          var err = new Error("Invalid format");
          err.friendly = "Invalid Gemini response";
          throw err;
        }
        showExtractResults(data.decisions);
      })
      .catch(function (err) {
        setExtractError((err && err.friendly) || (err && err.message) || "Extraction service unavailable");
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
      setExtractError("Could not extract a decision from this conversation.");
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
        links: [],
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
    renderAskSuggestions();

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
      if (els.toolbar) els.toolbar.hidden = true;
      return;
    }

    els.emptyState.hidden = true;
    els.stats.hidden = false;
    if (els.toolbar) els.toolbar.hidden = false;

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

    if (list.length === 0) {
      els.dashboard.innerHTML =
        '<div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted); font-size: 14px;">' +
        'No decisions match your search or filter.' +
        '</div>';
      return;
    }

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
