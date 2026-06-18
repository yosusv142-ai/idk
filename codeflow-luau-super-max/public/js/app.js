(() => {
  "use strict";

  const messagesEl = document.getElementById("messages");
  const chatForm = document.getElementById("chatForm");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const clearChatBtn = document.getElementById("clearChatBtn");

  /** @type {Array<{role: 'user'|'model', text: string}>} */
  let chatHistory = [];

  const LUAA_KEYWORDS = new Set([
    "local", "function", "end", "if", "then", "else", "elseif", "for", "while",
    "do", "repeat", "until", "return", "in", "and", "or", "not", "true", "false",
    "nil", "break", "continue", "type", "export", "typeof",
  ]);

  const LUAA_BUILTINS = new Set([
    "game", "workspace", "script", "print", "warn", "error", "pairs", "ipairs",
    "next", "table", "string", "math", "tonumber", "tostring", "typeof",
    "Instance", "Vector3", "CFrame", "Color3", "UDim2", "Enum", "task", "wait",
    "spawn", "delay", "require", "select", "unpack", "pcall", "xpcall",
    "setmetatable", "getmetatable", "rawget", "rawset", "newproxy",
  ]);

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlightLuau(code) {
    const lines = code.split("\n");
    return lines
      .map((line) => {
        if (/^\s*--/.test(line)) {
          return `<span class="hl-comment">${escapeHtml(line)}</span>`;
        }

        let result = "";
        let i = 0;

        while (i < line.length) {
          const rest = line.slice(i);

          if (/^--/.test(rest)) {
            result += `<span class="hl-comment">${escapeHtml(rest)}</span>`;
            break;
          }

          const strMatch = rest.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\[\[[\s\S]*?\]\])/);
          if (strMatch) {
            result += `<span class="hl-string">${escapeHtml(strMatch[0])}</span>`;
            i += strMatch[0].length;
            continue;
          }

          const numMatch = rest.match(/^(\d+\.?\d*)/);
          if (numMatch) {
            result += `<span class="hl-number">${escapeHtml(numMatch[0])}</span>`;
            i += numMatch[0].length;
            continue;
          }

          const wordMatch = rest.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
          if (wordMatch) {
            const word = wordMatch[0];
            let cls = "";
            if (LUAA_KEYWORDS.has(word)) cls = "hl-keyword";
            else if (LUAA_BUILTINS.has(word)) cls = "hl-builtin";
            else if (/^[A-Z]/.test(word)) cls = "hl-function";
            else if (word === "true" || word === "false" || word === "nil") cls = "hl-boolean";

            result += cls
              ? `<span class="${cls}">${escapeHtml(word)}</span>`
              : escapeHtml(word);
            i += word.length;
            continue;
          }

          const opMatch = rest.match(/^([+\-*/%=<>~]+|\.\.|\#|\(|\)|\{|\}|\[|\]|,|:|;|\.)/);
          if (opMatch) {
            result += `<span class="hl-operator">${escapeHtml(opMatch[0])}</span>`;
            i += opMatch[0].length;
            continue;
          }

          result += escapeHtml(rest[0]);
          i += 1;
        }

        return result;
      })
      .join("\n");
  }

  function renderMarkdown(text) {
    const parts = [];
    const codeBlockRegex = /```(?:luau|lua)?\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderInlineMarkdown(text.slice(lastIndex, match.index)));
      }

      const rawCode = match[1].replace(/^\n|\n$/g, "");
      const blockId = `code-block-${Date.now()}-${blockIndex++}`;
      parts.push(buildCodeTerminal(rawCode, blockId));
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(renderInlineMarkdown(text.slice(lastIndex)));
    }

    return parts.join("");
  }

  function renderInlineMarkdown(text) {
    let html = escapeHtml(text);

    html = html.replace(/^### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");
    html = html.replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`);
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");

    if (!html.startsWith("<h") && !html.startsWith("<ul") && !html.startsWith("<div")) {
      html = `<p>${html}</p>`;
    }

    return html;
  }

  function buildCodeTerminal(code, blockId) {
    const highlighted = highlightLuau(code);
    return `
      <div class="code-terminal" data-block-id="${blockId}">
        <div class="code-header">
          <div class="code-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="code-lang">Luau</span>
          <button type="button" class="copy-btn" data-code-id="${blockId}" aria-label="نسخ الكود">
            📋 نسخ الكود
          </button>
        </div>
        <div class="code-body">
          <pre id="${blockId}">${highlighted}</pre>
        </div>
      </div>
    `;
  }

  function attachCopyHandlers(container) {
    container.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const blockId = btn.dataset.codeId;
        const pre = document.getElementById(blockId);
        if (!pre) return;

        const code = pre.textContent || "";
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = "✅ تم النسخ!";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.innerHTML = "📋 نسخ الكود";
            btn.classList.remove("copied");
          }, 2000);
        } catch {
          const textarea = document.createElement("textarea");
          textarea.value = code;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          btn.textContent = "✅ تم النسخ!";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.innerHTML = "📋 نسخ الكود";
            btn.classList.remove("copied");
          }, 2000);
        }
      });
    });
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function createMessageElement(role, contentHtml, isError = false) {
    const article = document.createElement("article");
    article.className = `message ${role === "user" ? "user" : "assistant"}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "👤" : "🤖";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (isError) {
      bubble.innerHTML = `<p class="error-text">${contentHtml}</p>`;
    } else if (role === "user") {
      bubble.innerHTML = `<p>${escapeHtml(contentHtml)}</p>`;
    } else {
      bubble.innerHTML = renderMarkdown(contentHtml);
      attachCopyHandlers(bubble);
    }

    article.appendChild(avatar);
    article.appendChild(bubble);
    return article;
  }

  function showTypingIndicator() {
    const article = document.createElement("article");
    article.className = "message assistant";
    article.id = "typingIndicator";
    article.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesEl.appendChild(article);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    messagesEl.appendChild(createMessageElement("user", trimmed));
    chatHistory.push({ role: "user", text: trimmed });
    scrollToBottom();

    messageInput.value = "";
    sendBtn.disabled = true;
    showTypingIndicator();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory.slice(0, -1),
        }),
      });

      const data = await response.json();
      removeTypingIndicator();

      if (!response.ok) {
        messagesEl.appendChild(
          createMessageElement("assistant", data.error || "حدث خطأ غير متوقع.", true)
        );
      } else {
        messagesEl.appendChild(createMessageElement("assistant", data.reply));
        chatHistory.push({ role: "model", text: data.reply });
      }
    } catch {
      removeTypingIndicator();
      messagesEl.appendChild(
        createMessageElement(
          "assistant",
          "تعذر الاتصال بالخادم. تأكد من تشغيل السيرفر ثم حاول مجدداً.",
          true
        )
      );
    } finally {
      sendBtn.disabled = false;
      messageInput.focus();
      scrollToBottom();
    }
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(messageInput.value);
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  clearChatBtn.addEventListener("click", () => {
    chatHistory = [];
    messagesEl.innerHTML = `
      <article class="message assistant">
        <div class="avatar">🤖</div>
        <div class="bubble">
          <p>محادثة جديدة يا ملك! 🔥 وش السكربت اللي نبنيه الحين؟</p>
        </div>
      </article>
    `;
  });

  document.querySelectorAll(".quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      if (prompt) {
        messageInput.value = prompt;
        messageInput.focus();
      }
    });
  });
})();
