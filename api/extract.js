const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-pro-latest",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.6-flash"
].filter(Boolean);

const MODELS = Array.from(new Set(CANDIDATE_MODELS));

const SYSTEM_PROMPT = `You are a decision intelligence system that turns raw conversation text (Slack threads, meeting transcripts, emails, notes) into structured organizational memory.

A "decision" is a concrete choice that was committed to (e.g. "let's go with X", "we decided Y", "approved Z"). Do not extract mere ideas, open questions, or unresolved debates.
A single conversation may contain multiple decisions. If no clear decision was made, return an empty array.

For every extracted decision, capture:
1. title: Clear statement of the decision made.
2. context: The problem, situation, or trigger that led to this decision (source context).
3. reasoning: The rationale and justification given for why this choice was made (why).
4. owner: The person, contributor(s), or team who committed to, proposed, or owns the decision.
5. date: Date mentioned (YYYY-MM-DD), or null if not stated.
6. status: "Decided" if clearly agreed, or "Proposed" if pending final sign-off.
7. impact: "Low", "Medium", "High", or "Critical" based only on scope and consequences. Impact is not extraction confidence.
8. tags: 1-3 short domain tags (e.g. "Architecture", "Pricing", "Product", "Security", "Infrastructure", "UX", "Process").
9. alternativesConsidered: Other options or ideas discussed in the text that were rejected or deferred, and why if mentioned. If no alternatives were discussed, use null.
10. evidence: The direct supporting evidence, source context, or verbatim quote from the text. If none, use null.
11. expectedOutcome: The anticipated result, target metric, or success criteria stated. If none, use null.
12. reviewDate: Suggested follow-up date (YYYY-MM-DD) if a timeframe like "revisit in 3 months" or "check in Q4" is mentioned. Otherwise null.
13. provenance: Object marking whether each field was "stated" (explicitly written) or "inferred" (strongly implied by context). Only mark fields that have values.
14. fieldEvidence: For each field, provide a short exact verbatim quote from the input that supports it. Do not paraphrase or invent quotations. Use null when no exact quote supports the field.

CRITICAL RULES:
- Never fabricate missing facts. If an alternative, evidence, or expected outcome was NOT discussed or implied in the text, return null for that field.
- Distinguish between "stated" (explicitly spoken/written) and "inferred" (deduced from context).
- "evidence" must be an exact verbatim quote present in the input, or null. Do not put a summary in quotation marks.
- If the input appears to be a LORE-generated answer, summary, or stored decision rather than an original conversation, do not treat it as independent evidence. Mark unsupported fields inferred and return no evidence quote.
- Never treat impact as confidence.

Return ONLY valid JSON in this exact shape:
{
  "decisions": [
    {
      "title": "string",
      "context": "string or null",
      "reasoning": "string or null",
      "owner": "string or null",
      "date": "string or null",
      "status": "Decided or Proposed",
      "impact": "Low or Medium or High or Critical",
      "tags": ["string"],
      "alternativesConsidered": "string or null",
      "evidence": "string or null",
      "expectedOutcome": "string or null",
      "reviewDate": "string or null",
      "fieldEvidence": {
        "title": "exact quote or null",
        "status": "exact quote showing commitment or null",
        "context": "exact quote or null",
        "reasoning": "exact quote or null",
        "owner": "exact quote or null",
        "alternativesConsidered": "exact quote or null",
        "expectedOutcome": "exact quote or null"
      },
      "provenance": {
        "title": "stated",
        "context": "stated or inferred",
        "reasoning": "stated or inferred",
        "owner": "stated or inferred",
        "impact": "stated or inferred",
        "alternativesConsidered": "stated or inferred",
        "expectedOutcome": "stated or inferred"
      }
    }
  ]
}`;

function normalizeSourceText(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

function cleanDecision(raw, sourceText) {
  if (!raw || typeof raw !== "object") return null;
  var str = function (v) {
    return v === null || v === undefined ? "" : String(v).trim();
  };
  var title = str(raw.title || raw.decision);
  if (!title) return null;

  var rawFieldEvidence = raw.fieldEvidence && typeof raw.fieldEvidence === "object" ? raw.fieldEvidence : {};
  var normalizedSource = normalizeSourceText(sourceText);
  var fieldEvidence = {};
  ["title", "decision", "status", "context", "reasoning", "owner", "alternativesConsidered", "expectedOutcome", "evidence"].forEach(function (field) {
    var quote = str(rawFieldEvidence[field]);
    var normalizedQuote = normalizeSourceText(quote);
    if (quote && quote.length <= 1000 && normalizedQuote && normalizedSource.indexOf(normalizedQuote) !== -1) {
      fieldEvidence[field] = quote;
    }
  });

  var validImpacts = ["Low", "Medium", "High", "Critical"];
  var rawImpact = str(raw.impact);
  var impact = validImpacts.indexOf(rawImpact) !== -1 ? rawImpact : "Medium";

  var validStatuses = ["Decided", "Proposed"];
  var rawStatus = str(raw.status);
  var status = validStatuses.indexOf(rawStatus) !== -1 ? rawStatus : "Decided";

  var evidenceCandidates = [str(raw.evidence), str(rawFieldEvidence.evidence)].filter(Boolean);
  var verifiedEvidence = evidenceCandidates.find(function (quote) {
    var normalizedQuote = normalizeSourceText(quote);
    return quote.length <= 1000 && normalizedQuote && normalizedSource.indexOf(normalizedQuote) !== -1;
  }) || "";
  var titleQuote = fieldEvidence.title || fieldEvidence.decision || "";
  var statusQuote = fieldEvidence.status || "";
  var reasoningQuote = fieldEvidence.reasoning || "";
  if (verifiedEvidence) fieldEvidence.evidence = verifiedEvidence;

  var confidenceScore = (titleQuote ? 35 : 0) +
    (statusQuote ? (status === "Decided" ? 35 : 20) : 0) +
    (reasoningQuote ? 10 : 0) +
    (verifiedEvidence ? 20 : 0);
  var confidenceBand = confidenceScore >= 80 ? "High" : (confidenceScore >= 50 ? "Review" : "Low");
  var confidenceReasons = [
    titleQuote
      ? "Decision wording has a verbatim source match."
      : "Decision wording has no verified verbatim source match.",
    statusQuote
      ? (status === "Decided" ? "Commitment language has a verbatim source match." : "The proposal status has a verbatim source match.")
      : "No exact quote verifies that this was committed to.",
    reasoningQuote ? "Reasoning has a verbatim source match." : "",
    verifiedEvidence
      ? "Supporting evidence matches the original input text."
      : "No supporting quote could be matched to the original input."
  ].filter(Boolean);

  var tags = [];
  if (Array.isArray(raw.tags)) {
    tags = raw.tags
      .map(function (t) { return str(t); })
      .filter(function (t) { return t.length > 0 && t.length <= 30; })
      .slice(0, 5);
  }

  var rawProvenance = raw.provenance && typeof raw.provenance === "object" ? raw.provenance : {};
  var provenance = {};
  var fields = {
    title: title,
    context: str(raw.context || raw.sourceContext || raw.source_context),
    reasoning: str(raw.reasoning || raw.why || raw.rationale),
    owner: str(raw.owner || raw.contributors || raw.contributor),
    status: status,
    alternativesConsidered: str(raw.alternativesConsidered || raw.alternatives || raw.alternatives_considered),
    expectedOutcome: str(raw.expectedOutcome || raw.expected_outcome || raw.outcome)
  };
  Object.keys(fields).forEach(function (field) {
    if (!fields[field]) return;
    provenance[field] = rawProvenance[field] === "stated" && fieldEvidence[field]
      ? "stated"
      : "inferred";
  });

  return {
    title: title,
    context: str(raw.context || raw.sourceContext || raw.source_context),
    reasoning: str(raw.reasoning || raw.why || raw.rationale),
    owner: str(raw.owner || raw.contributors || raw.contributor),
    date: str(raw.date),
    status: status,
    impact: impact,
    tags: tags,
    alternativesConsidered: str(raw.alternativesConsidered || raw.alternatives || raw.alternatives_considered),
    evidence: verifiedEvidence,
    expectedOutcome: str(raw.expectedOutcome || raw.expected_outcome || raw.outcome),
    reviewDate: str(raw.reviewDate || raw.review_date),
    provenance: provenance,
    confidenceScore: confidenceScore,
    confidenceBand: confidenceBand,
    confidenceReasons: confidenceReasons,
    evidenceVerified: Boolean(verifiedEvidence),
    sourceLabel: "Pasted discussion",
    sourceTrace: {
      type: "pasted-text",
      sourceLabel: "Pasted discussion",
      quotesByField: fieldEvidence
    }
  };
}

function parseJsonOutput(raw) {
  if (!raw) return null;
  var cleaned = String(raw).trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```$/i, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // If there is surrounding text, locate the outermost JSON object
    var start = cleaned.indexOf("{");
    var end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
    throw e1;
  }
}

const WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window
const MAX_REQUESTS = 10; // Max 10 requests per rolling 1-hour window
const rateLimitMap = new Map();

function getClientIp(req) {
  var headers = req.headers || {};
  // Standard deployment platform (Vercel) client IP headers
  var forwarded = headers["x-forwarded-for"] || headers["x-real-ip"];
  if (forwarded) {
    if (typeof forwarded === "string") {
      var first = forwarded.split(",")[0].trim();
      if (first) return first;
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      var firstElem = String(forwarded[0]).split(",")[0].trim();
      if (firstElem) return firstElem;
    }
  }

  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }
  return "127.0.0.1";
}

function checkRateLimit(ip, now) {
  var currentTime = typeof now === "number" ? now : Date.now();
  var windowStart = currentTime - WINDOW_MS;

  // Clean up expired entries across the entire Map so it does not grow indefinitely
  for (var [key, times] of rateLimitMap.entries()) {
    var activeTimes = times.filter(function (t) { return t > windowStart; });
    if (activeTimes.length === 0) {
      rateLimitMap.delete(key);
    } else if (activeTimes.length !== times.length) {
      rateLimitMap.set(key, activeTimes);
    }
  }

  var timestamps = rateLimitMap.get(ip) || [];
  var valid = timestamps.filter(function (t) { return t > windowStart; });

  if (valid.length >= MAX_REQUESTS) {
    rateLimitMap.set(ip, valid);
    var oldest = valid[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldest + WINDOW_MS - currentTime
    };
  }

  valid.push(currentTime);
  rateLimitMap.set(ip, valid);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - valid.length,
    resetMs: 0
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  var ip = getClientIp(req);
  var rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    var retryAfterSec = Math.max(1, Math.ceil(rateCheck.resetMs / 1000));
    if (typeof res.setHeader === "function") {
      res.setHeader("Retry-After", String(retryAfterSec));
    }
    res.status(429).json({
      error: "Request limit reached. You can make up to 10 extraction requests per hour. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED"
    });
    return;
  }

  var body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  var text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "Text is required" });
    return;
  }
  if (body.sourceConfirmedOriginal !== true) {
    res.status(400).json({
      error: "Confirm that extraction uses original source text, not a LORE-generated answer or stored summary.",
      code: "ORIGINAL_SOURCE_REQUIRED"
    });
    return;
  }

  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "Server is not configured with a Google Gemini API key",
      code: "MISSING_API_KEY"
    });
    return;
  }

  var lastError = null;
  var lastStatus = 502;
  var successfulData = null;
  var attempts = [];

  // Try configured models with fallback in case of high demand / overload (503 / 429)
  for (var i = 0; i < MODELS.length; i++) {
    var modelName = MODELS[i];
    var endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
      modelName + ":generateContent";

    try {
      var response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: text }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 4096
          }
        })
      });

      if (!response.ok) {
        var rawBody = "";
        var detail = "";
        try {
          rawBody = await response.text();
          try {
            var errBody = JSON.parse(rawBody);
            detail = (errBody && errBody.error && errBody.error.message) || JSON.stringify(errBody);
          } catch (e2) {
            detail = rawBody;
          }
        } catch (e) {
          rawBody = "";
        }

        console.error("extract: Gemini error on model " + modelName, response.status, detail);
        attempts.push({ model: modelName, status: response.status, detail: detail });
        lastStatus = response.status >= 500 ? 502 : response.status;
        lastError = detail || ("HTTP " + response.status);

        // Always try next model on failure
        continue;
      }

      var data = await response.json();
      successfulData = data;
      break;
    } catch (netErr) {
      console.error("extract: network error calling " + modelName, netErr);
      attempts.push({ model: modelName, error: netErr && netErr.message });
      lastError = netErr && netErr.message;
      lastStatus = 502;
    }
  }

  if (!successfulData) {
    res.status(lastStatus).json({
      error: "Gemini API request failed" + (lastError ? ": " + lastError : ""),
      code: "UPSTREAM_FAILED",
      detail: lastError,
      attempts: attempts
    });
    return;
  }

  var content = "";
  if (
    successfulData.candidates &&
    successfulData.candidates[0] &&
    successfulData.candidates[0].content &&
    Array.isArray(successfulData.candidates[0].content.parts)
  ) {
    content = successfulData.candidates[0].content.parts.map(function (block) {
      return block && block.text ? block.text : "";
    }).join("");
  }

  var parsed = null;
  try {
    parsed = parseJsonOutput(content);
  } catch (e) {
    console.error("extract: Gemini non-JSON output", content);
    res.status(502).json({
      error: "Invalid Gemini response: could not parse JSON output",
      code: "INVALID_RESPONSE",
      raw: content ? content.slice(0, 300) : ""
    });
    return;
  }

  if (!parsed || !Array.isArray(parsed.decisions)) {
    console.error("extract: Gemini malformed response", content);
    res.status(502).json({
      error: "Invalid Gemini response: missing decisions array",
      code: "MALFORMED_RESPONSE",
      raw: content ? content.slice(0, 300) : ""
    });
    return;
  }

  var decisions = parsed.decisions
    .map(function (decision) { return cleanDecision(decision, text); })
    .filter(function (d) { return d !== null; });

  res.status(200).json({ decisions: decisions });
}

export { cleanDecision, normalizeSourceText, rateLimitMap, checkRateLimit, WINDOW_MS, MAX_REQUESTS, getClientIp };
