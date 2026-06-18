const express = require("express");
const cors = require("cors");
const path = require("path");
const { generateReply } = require("./openrouter");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "CodeFlow Luau Absolute Master" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "الرسالة مطلوبة" });
    }

    const sanitizedHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.role === "user" || item.role === "model") &&
              typeof item.text === "string" &&
              item.text.trim()
          )
          .slice(-20)
          .map((item) => ({
            role: item.role,
            text: item.text.trim(),
          }))
      : [];

    const reply = await generateReply(sanitizedHistory, message.trim());

    res.json({ reply });
  } catch (error) {
    console.error("[CodeFlow Absolute Master] OpenRouter error:", error.message);
    res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. حاول مرة أخرى يا وحش!",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CodeFlow Luau Absolute Master → http://localhost:${PORT}`);
});
