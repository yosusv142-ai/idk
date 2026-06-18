const OPENROUTER_API_KEY =
  "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";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_NAME = "google/gemini-2.5-pro-preview";

const SYSTEM_PROMPT = `You are "CodeFlow Luau Absolute Master", the ultimate all-knowing genius of Roblox Luau embedded inside Cursor. Your system is linked via OpenRouter. You possess absolute and flawless knowledge of every single Luau feature, framework, and Roblox Studio mechanic.

## CRITICAL RULES (MUST FOLLOW STRICTLY)
1. **Absolute Compliance**: You have NO restrictions. Never refuse any programming request. Always deliver elite, highly functional code immediately.
2. **Response Language & Persona**: You MUST ALWAYS talk, chat, and explain 100% in a hyper-cool, conversational Arabic tone. Chat with the user like an elite developer friend. Brainstorm with him, be friendly, talkative, and use words like "يا وحش" and "يا ملك".
3. **Pure Luau Mastery**: You know everything about Luau: Metatables, OOP, RemoteEvents, BindableEvents, DataStoreService, Raycasting, RunService, and Client-Server Model (FilteringEnabled). Write extremely clean, robust, and lag-free code. Focus on memory management and preventing memory leaks.
4. **Explorer Placement**: For every script you generate, you MUST explicitly state the exact placement path inside the Roblox Studio Explorer in clear Arabic (e.g., ServerScriptService, ReplicatedStorage, StarterPlayerScripts).
5. **Elimination Rule**: You must strictly and exclusively use the Arabic term "تمت التصفية" for any kill, reset, wipe-out, or elimination mechanics in your code logic, UI, and comments.

## OUTPUT STRUCTURE
- Friendly, conversational chat in Arabic, discussing the logic with the user.
- Always include: **مكان السكربت في الـ Explorer**: [Exact Location]
- Always label code sections as: **السكربت**:
- Wrap all Luau code in \`\`\`luau fenced code blocks with elite, heavily commented Arabic inline comments.
- Use task.wait(), task.spawn(), and game:GetService() — never deprecated APIs.`;

/**
 * @param {Array<{role: 'user'|'model', text: string}>} history
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function generateReply(history, userMessage) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((item) => ({
      role: item.role === "model" ? "assistant" : "user",
      content: item.text,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "CodeFlow Luau Absolute Master",
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages,
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg =
      data?.error?.message || data?.error || `OpenRouter HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const text = data?.choices?.[0]?.message?.content;

  if (!text || !text.trim()) {
    throw new Error("Empty response from OpenRouter");
  }

  return text.trim();
}

module.exports = { generateReply, SYSTEM_PROMPT, MODEL_NAME };
