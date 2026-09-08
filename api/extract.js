const DEFAULT_MODEL = "gemini-3.6-flash";
const MODEL = process.env.GEMINI_MODEL || DEFAULT_MODEL;

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/" +
  MODEL + ":generateContent";

const SYSTEM_PROMPT = `You are a decision intelligence system that turns raw conversation text (Slack threads, meeting transcripts, emails, notes) into structured organizational memory.

A "decision" is a concrete choice that was committed to (e.g. "let's go with X", "we decided Y", "approved Z"). Do not extract mere ideas, open questions, or unresolved debates.
A single conversation may contain multiple decisions. If no clear decision was made, return an empty array.

For every extracted decision, capture:
1. title: Clear statement of the decision made.
2. context: The problem, situation, or trigger that led to this decision.
3. reasoning: The rationale and justification given for why this choice was made.
4. owner: The person who committed to, proposed, or owns the decision.
5. date: Date mentioned (YYYY-MM-DD), or null if not stated.
6. status: "Decided" if clearly agreed, or "Proposed" if pending final sign-off.
7. impact: "Low", "Medium", "High", or "Critical" based on the scope/consequences described.
8. tags: 1-3 short domain tags (e.g. "Architecture", "Pricing", "Product", "Security", "Infrastructure", "UX", "Process").
9. alternativesConsidered: Other options or ideas discussed in the text that were rejected or deferred, and why if mentioned. If no alternatives were discussed, use null.
10. evidence: The direct supporting evidence mentioned in the text (metrics, benchmarks, user feedback, customer quotes, or key source excerpt). If none, use null.
11. expectedOutcome: The anticipated result, target metric, or success criteria stated. If none, use null.
12. reviewDate: Suggested follow-up date (YYYY-MM-DD) if a timeframe like "revisit in 3 months" or "check in Q4" is mentioned. Otherwise null.
13. provenance: Object marking whether each field was "stated" (explicitly written) or "inferred" (strongly implied by context). Only mark fields that have values.

CRITICAL RULES:
- Never fabricate missing facts. If an alternative, evidence, or expected outcome was NOT discussed or implied in the text, return null for that field.
- Distinguish between "stated" (explicitly spoken/written) and "inferred" (deduced from context).
- Preserve exact customer quotes, data metrics, or key lines in "evidence" to maintain source provenance.

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

function cleanDecision(raw) {
  if (!raw || typeof raw !== "object") return null;
  var str = function (v) {
    return v === null || v === undefined ? "" : String(v).trim();
  };
  var title = str(raw.title || raw.decision);
  if (!title) return null;

  var validImpacts = ["Low", "Medium", "High", "Critical"];
  var rawImpact = str(raw.impact);
  var impact = validImpacts.indexOf(rawImpact) !== -1 ? rawImpact : "Medium";

  var validStatuses = ["Decided", "Proposed"];
  var rawStatus = str(raw.status);
  var status = validStatuses.indexOf(rawStatus) !== -1 ? rawStatus : "Decided";

  var tags = [];
  if (Array.isArray(raw.tags)) {
    tags = raw.tags
      .map(function (t) { return str(t); })
      .filter(function (t) { return t.length > 0 && t.length <= 30; })
      .slice(0, 5);
  }

  var provenance = raw.provenance && typeof raw.provenance === "object" ? raw.provenance : {};

  return {
    title: title,
    context: str(raw.context),
    reasoning: str(raw.reasoning),
    owner: str(raw.owner),
    date: str(raw.date),
    status: status,
    impact: impact,
    tags: tags,
    alternativesConsidered: str(raw.alternativesConsidered),
    evidence: str(raw.evidence),
    expectedOutcome: str(raw.expectedOutcome),
    reviewDate: str(raw.reviewDate),
    provenance: provenance
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
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

  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is not configured with a Google Gemini API key" });
    return;
  }

  try {
    var response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: text }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { maxOutputTokens: 4096 }
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
      console.error("extract: Gemini upstream error", response.status, rawBody);
      res.status(502).json({ error: "LLM request failed" + (detail ? ": " + detail : "") });
      return;
    }

    var data = await response.json();
    var content = "";
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      Array.isArray(data.candidates[0].content.parts)
    ) {
      content = data.candidates[0].content.parts.map(function (block) {
        return block && block.text ? block.text : "";
      }).join("");
    }

    var parsed = null;
    try {
      parsed = JSON.parse(content.trim());
    } catch (e) {
      console.error("extract: Gemini non-JSON output", content);
      res.status(502).json({ error: "Model returned non-JSON output" });
      return;
    }

    if (!parsed || !Array.isArray(parsed.decisions)) {
      console.error("extract: Gemini malformed response", content);
      res.status(502).json({ error: "Model response was malformed" });
      return;
    }

    var decisions = parsed.decisions
      .map(cleanDecision)
      .filter(function (d) { return d !== null; });

    res.status(200).json({ decisions: decisions });
  } catch (e) {
    res.status(500).json({ error: "Extraction failed:" + (e && e.message ? " " + e.message : "") });
  }
}