const DEFAULT_MODEL = "gemini-3.6-flash";
const MODEL = process.env.GEMINI_MODEL || DEFAULT_MODEL;

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/" +
  MODEL + ":generateContent";

const SYSTEM_PROMPT = `You extract concrete decisions from raw text (chat threads, meeting notes, transcripts). A "decision" is a specific choice that was actually made, not an idea floated, a question raised, or an option merely discussed.

Rules:
- Only extract a decision if the text shows someone committing to a specific choice (e.g. "let's go with X", "we're doing Y", "decided to Z"). Do not extract open questions, options someone listed but did not choose, or disagreements that weren't resolved.
- If the text contains no clear decision, return an empty array. Do not force one.
- A single text block can contain more than one decision.
- owner: the person who stated or committed to the decision. If unclear, use null.
- context: the problem or situation that led to this decision, taken from what's actually in the text. Do not invent context that isn't present.
- reasoning: the "why" behind the choice, taken from the text. If no reasoning is stated, use null rather than inventing one.

Return ONLY valid JSON, no markdown fences, no preamble, in this shape:

{
  "decisions": [
    {
      "title": "string",
      "context": "string or null",
      "reasoning": "string or null",
      "owner": "string or null"
    }
  ]
}`;

function cleanDecision(raw) {
  if (!raw || typeof raw !== "object") return null;
  var str = function (v) {
    return v === null || v === undefined ? "" : String(v).trim();
  };
  var title = str(raw.title);
  if (!title) return null;
  return {
    title: title,
    context: str(raw.context),
    reasoning: str(raw.reasoning),
    owner: str(raw.owner)
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