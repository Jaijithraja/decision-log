const MODEL = "claude-sonnet-4-6";

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

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is not configured with an Anthropic API key" });
    return;
  }

  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }]
      })
    });

    if (!response.ok) {
      var detail = "";
      try {
        var errBody = await response.json();
        detail = (errBody && errBody.error && errBody.error.message) || JSON.stringify(errBody);
      } catch (e) {
        detail = "";
      }
      res.status(502).json({ error: "LLM request failed" + (detail ? ": " + detail : "") });
      return;
    }

    var data = await response.json();
    var content = "";
    if (Array.isArray(data.content)) {
      content = data.content.map(function (block) {
        return block && block.text ? block.text : "";
      }).join("");
    }

    var parsed = null;
    try {
      parsed = JSON.parse(content.trim());
    } catch (e) {
      res.status(502).json({ error: "Model returned non-JSON output" });
      return;
    }

    if (!parsed || !Array.isArray(parsed.decisions)) {
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