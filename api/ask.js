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

const SYSTEM_PROMPT = `You are ASK LORE, an evidence-based decision intelligence system and organizational memory layer.
Your sole purpose is to answer the user's question strictly from the supplied LORE decision records.

CRITICAL RULES:
1. Answer ONLY from the provided decision records. Do not extrapolate, invent, or draw from outside general knowledge.
2. Never hallucinate facts, decisions, owners, or evidence.
3. If the provided decision records do NOT contain enough information to answer the question, or if no decision is relevant:
   Return:
   {
     "answerable": false,
     "answer": "I couldn't find a decision in Lore that answers this.",
     "sources": []
   }
4. When answerable:
   - Provide a concise, clear, and direct answer (1-3 sentences) to the user's question in "answer".
   - Frame conclusions as what the saved LORE records say, not as independently verified facts.
   - If a record is Superseded or Reversed, state that clearly and never present it as the current choice.
   - In "sources", cite the specific decision record(s) that directly answer the question.
   - For each cited source, provide:
     - "decisionId": The exact id of the decision from the record.
     - "title": The title/decision statement.
     - "why": The reasoning/rationale explaining why the choice was made.
     - "evidence": The stored supporting text (or null if none); it is an original-source quote only when the record marks it source-verified.
     - "source": A short attribution string like "Alex · 2026-10-15" or owner/date info from the record.
     - "provenance": "stated" if the rationale was explicitly stated in the record, or "inferred" if strongly deduced from context.
5. Distinguish stated information from inferred information. Never fabricate quotations.
6. Treat every decision record as a stored claim, not independent corroboration. Never use one LORE summary, rationale, outcome note, or earlier Ask answer to verify another record. Only a source-verified quote can be described as matched to original input, and even that quote does not independently prove the decision was correct.

Return ONLY valid JSON in this exact shape:
{
  "answerable": true,
  "answer": "string",
  "sources": [
    {
      "decisionId": "string",
      "title": "string",
      "why": "string",
      "evidence": "string or null",
      "source": "string or null",
      "provenance": "stated or inferred"
    }
  ]
}`;

function parseJsonOutput(raw) {
  if (!raw) return null;
  var cleaned = String(raw).trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```$/i, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    var start = cleaned.indexOf("{");
    var end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
    throw e1;
  }
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

  var query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  var records = Array.isArray(body.records) ? body.records : (Array.isArray(body.decisions) ? body.decisions : []);

  // If no decision records were provided or found, immediately return non-answerable without calling LLM
  if (!records.length) {
    res.status(200).json({
      answerable: false,
      answer: "I couldn't find a decision in Lore that answers this.",
      sources: []
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

  // Format decision records concisely for prompt injection
  var formattedRecords = records.map(function (d, idx) {
    return {
      index: idx + 1,
      id: d.id,
      decision: d.decision || d.title,
      context: d.context || null,
      reasoning: d.reasoning || null,
      owner: d.owner || null,
      date: d.date || null,
      status: d.status || "Decided",
      impact: d.impact || null,
      tags: d.tags || [],
      alternativesConsidered: d.alternativesConsidered || null,
      evidence: d.evidence || null,
      expectedOutcome: d.expectedOutcome || null,
      actualOutcome: d.actualOutcome || null,
      reviewDate: d.reviewDate || null,
      provenance: d.provenance || null,
      sourceKind: d.sourceKind || (d.sourceTrace ? "conversation-extract" : "legacy-record"),
      sourceLabel: d.sourceLabel || (d.sourceTrace && d.sourceTrace.sourceLabel) || null,
      evidenceVerified: d.evidenceVerified === true,
      confidenceScore: Number.isFinite(d.confidenceScore) ? d.confidenceScore : null,
      humanReviewed: d.humanReviewed === true,
      decisionChange: d.decisionChange || null,
      supersedesId: d.supersedesId || null,
      supersededBy: d.supersededBy || null
    };
  });

  var promptText = "USER QUESTION:\n\"" + query + "\"\n\nAVAILABLE LORE DECISION RECORDS:\n" +
    JSON.stringify(formattedRecords, null, 2) + "\n\n" +
    "Answer the user's question strictly from the records above in accordance with the system rules.";

  var lastError = null;
  var lastStatus = 502;
  var successfulData = null;
  var attempts = [];

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
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2048
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

        console.error("ask: Gemini error on model " + modelName, response.status, detail);
        attempts.push({ model: modelName, status: response.status, detail: detail });
        lastStatus = response.status >= 500 ? 502 : response.status;
        lastError = detail || ("HTTP " + response.status);
        continue;
      }

      var data = await response.json();
      successfulData = data;
      break;
    } catch (netErr) {
      console.error("ask: network error calling " + modelName, netErr);
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
    console.error("ask: Gemini non-JSON output", content);
    res.status(502).json({
      error: "Invalid Gemini response: could not parse JSON output",
      code: "INVALID_RESPONSE",
      raw: content ? content.slice(0, 300) : ""
    });
    return;
  }

  if (!parsed || typeof parsed !== "object") {
    res.status(502).json({
      error: "Invalid Gemini response shape",
      code: "MALFORMED_RESPONSE"
    });
    return;
  }

  var recordById = new Map(formattedRecords.map(function (record) {
    return [String(record.id), record];
  }));
  var sources = Array.isArray(parsed.sources) ? parsed.sources.map(function (source) {
    var record = source && recordById.get(String(source.decisionId));
    if (!record) return null;
    return {
      decisionId: record.id,
      title: record.decision,
      why: record.reasoning || "",
      evidence: record.evidence || null,
      source: record.sourceLabel || [record.owner, record.date].filter(Boolean).join(" · ") || null,
      sourceKind: record.sourceKind,
      evidenceVerified: record.evidenceVerified,
      confidenceScore: record.confidenceScore,
      humanReviewed: record.humanReviewed,
      status: record.status,
      decisionChange: record.decisionChange,
      provenance: record.sourceKind === "manual" ? "user-entered" :
        (record.sourceKind === "legacy-record" ? "legacy-record" :
          (record.provenance && record.provenance.reasoning === "stated" ? "stated" : "inferred"))
    };
  }).filter(Boolean) : [];
  var answerable = parsed.answerable === true && sources.length > 0 && typeof parsed.answer === "string" && parsed.answer.trim().length > 0;
  var answer = answerable ? parsed.answer.trim() : "I couldn't find a decision in Lore that answers this.";

  res.status(200).json({
    answerable: answerable,
    answer: answer,
    sources: answerable ? sources : []
  });
}
