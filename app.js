function isDashboardPage() {
  return document.body.classList.contains("dashboard-body") ||
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("index.html");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isDashboardPage()) {
    injectFloatingControls();
    ensureNotesDrawerMarkup();
    setupProgressBarAndPosition();
    setupTextHighlighterEngine();
    setupSearchEngine();
    setupShortNotesDrawer();
  }
});

/* Search Engine Fix for Notion Exports */
function setupSearchEngine() {
  if (document.querySelector(".dashboard-body")) return;
  const modal = document.getElementById("search-modal");
  const input = document.getElementById("search-input");
  const resultsList = document.getElementById("search-results");
  const historyContainer = document.getElementById("recent-searches-chips");

  if (!modal || !input) return;

  function getHistory() {
    return JSON.parse(localStorage.getItem("econ_search_history") || "[]");
  }

  function saveQuery(q) {
    if (!q || q.length < 2) return;
    let list = getHistory().filter(item => item.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    if (list.length > 4) list = list.slice(0, 4);
    localStorage.setItem("econ_search_history", JSON.stringify(list));
    renderHistory();
  }

  function renderHistory() {
    if (!historyContainer) return;
    const history = getHistory();
    historyContainer.innerHTML = "";
    if (history.length === 0) {
      if (historyContainer.parentElement) historyContainer.parentElement.style.display = "none";
      return;
    }
    if (historyContainer.parentElement) historyContainer.parentElement.style.display = "flex";
    history.forEach(term => {
      const chip = document.createElement("span");
      chip.className = "search-chip";
      chip.innerText = term;
      chip.addEventListener("click", () => {
        input.value = term;
        executeSearch(term);
      });
      historyContainer.appendChild(chip);
    });
  }

  function openSearch() {
    modal.classList.add("active");
    renderHistory();
    setTimeout(() => input.focus(), 100);
  }

  function closeSearch() {
    modal.classList.remove("active");
    input.value = "";
    if (resultsList) resultsList.innerHTML = "";
  }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeSearch();
    }
    if (e.key === "Enter" && modal.classList.contains("active") && document.activeElement === input) {
      e.preventDefault();
      executeSearch(input.value);
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("#search-trigger-btn")) openSearch();
    if (e.target.closest("#close-search-btn")) closeSearch();
    if (e.target.closest("#search-submit-btn")) executeSearch(input.value);
    if (modal.classList.contains("active") && e.target === modal) closeSearch();
  });

  function executeSearch(query) {
    if (!resultsList) return;
    resultsList.innerHTML = "";
    const cleanQuery = String(query || "").trim().toLowerCase();
    if (cleanQuery.length < 2) {
      resultsList.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--text-muted);">Type at least 2 characters to search.</div>`;
      return;
    }

    // Search across all text elements including Notion blocks
    const nodes = document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote, td, span, div");
    let matches = 0;
    const visitedTexts = new Set();

    nodes.forEach((el, idx) => {
      if (matches >= 25) return;
      
      // Avoid parent containers if child element is already targeted
      if (el.children.length > 3) return;

      const text = (el.textContent || el.innerText || "").trim();
      if (!text || visitedTexts.has(text)) return;

      if (text.toLowerCase().includes(cleanQuery)) {
        visitedTexts.add(text);
        matches++;

        const targetId = el.id || `search-target-node-${idx}`;
        el.id = targetId;

        const item = document.createElement("div");
        item.className = "search-item";
        item.innerHTML = `
          <div class="search-item-tag">${el.tagName}</div>
          <div>${text.substring(0, 110)}...</div>
        `;

        item.addEventListener("click", () => {
          saveQuery(cleanQuery);
          closeSearch();
          
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
            targetEl.classList.add("search-highlight-pulse");
            setTimeout(() => targetEl.classList.remove("search-highlight-pulse"), 2500);
          }
        });
        resultsList.appendChild(item);
      }
    });

    if (matches === 0) {
      resultsList.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--text-muted);">No text matches found for "${query}"</div>`;
    }
  }

  input.addEventListener("input", (e) => executeSearch(e.target.value));
  input.addEventListener("search", (e) => executeSearch(e.target.value));
}

function ensureNotesDrawerMarkup() {
  if (document.getElementById("notes-drawer")) return;
  const drawerHTML = `
    <div id="notes-drawer" class="drawer-backdrop">
      <div class="drawer-content">
        <div class="drawer-header">
          <h3 style="margin:0;">📝 Subject Short Notes</h3>
          <button id="close-drawer-btn" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-primary);">✕</button>
        </div>
        <div id="drawer-notes-list" class="notes-list"></div>
        <button id="btn-download-txt" class="btn-icon-text primary" style="width:100%; justify-content:center; margin-top:1rem;">📥 Export Short-Notes (.txt)</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", drawerHTML);
}

/* Floating Navigation Bar */
function injectFloatingControls() {
  if (isDashboardPage()) return;
  const path = window.location.pathname;
  const currentSubId = path.split("/").slice(-2)[0] || "general";
  
  const bookmarks = JSON.parse(localStorage.getItem("econ_starred") || "[]");
  const isStarred = bookmarks.includes(currentSubId);

  const container = document.createElement("div");
  container.innerHTML = `
    <div id="top-progress-container" style="position:fixed;top:0;left:0;width:100%;height:4px;z-index:9999;">
      <div id="top-progress-bar" style="height:100%;width:0%;background:var(--accent-primary);"></div>
    </div>

    <div id="floating-toolbar">
      <a href="../../index.html" class="floating-btn" title="Back to Dashboard">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      </a>
      <button id="search-trigger-btn" class="floating-btn" title="Search Page (Ctrl + K)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </button>
      <button id="star-toggle-btn" class="floating-btn" title="Star Subject">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <button id="open-notes-btn" class="floating-btn" title="Subject Short Notes Drawer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      </button>
      <button class="floating-btn floating-theme-btn" title="Toggle Light/Dark Theme"></button>
    </div>

    <div id="search-modal" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-search-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" id="search-input" autocomplete="off" placeholder="Search page text... (Press ESC to close)">
          <button id="search-submit-btn" class="search-submit-btn" title="Search" type="button">🔎</button>
          <button id="close-search-btn" class="search-close-btn" title="Close" type="button">✕</button>
        </div>
        <div class="recent-searches">
          <span>Recent:</span>
          <div id="recent-searches-chips" style="display:flex; gap:0.4rem; flex-wrap:wrap;"></div>
        </div>
        <div id="search-results" class="modal-results-list"></div>
      </div>
    </div>

    <!-- Text Highlight Popover with Undo / Redo -->
    <div id="highlight-popup">
      <div class="color-dot dot-yellow" data-color="yellow" title="Yellow Highlight"></div>
      <div class="color-dot dot-green" data-color="green" title="Green Highlight"></div>
      <div class="color-dot dot-blue" data-color="blue" title="Blue Highlight"></div>
      <div class="color-dot dot-pink" data-color="pink" title="Pink Highlight"></div>
      <button class="pop-btn" id="pop-underline" title="Underline"><u>U</u></button>
      <button class="pop-btn" id="pop-strike" title="Strikethrough"><s>S</s></button>
      <button class="pop-btn" id="pop-comment" title="Add Note Comment">💬</button>
      <div style="width:1px; height:18px; background:var(--border-color); margin:0 2px;"></div>
      <button class="pop-btn" id="pop-undo" title="Undo Last Highlight">↩ Undo</button>
      <button class="pop-btn" id="pop-redo" title="Redo">↪ Redo</button>
    </div>
  `;
  document.body.appendChild(container);

  // Star Toggle
  document.getElementById("star-toggle-btn").addEventListener("click", () => {
    let list = JSON.parse(localStorage.getItem("econ_starred") || "[]");
    const svg = document.querySelector("#star-toggle-btn svg");
    if (list.includes(currentSubId)) {
      list = list.filter(id => id !== currentSubId);
      svg.setAttribute("fill", "none");
    } else {
      list.push(currentSubId);
      svg.setAttribute("fill", "currentColor");
    }
    localStorage.setItem("econ_starred", JSON.stringify(list));
  });
}

/* Progress Bar and Scroll Position Sync */
function setupProgressBarAndPosition() {
  const path = window.location.pathname;
  const currentSubId = path.split("/").slice(-2)[0] || "general";
  const bar = document.getElementById("top-progress-bar");

  window.addEventListener("scroll", () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    const pct = (window.scrollY / total) * 100;
    if (bar) bar.style.width = `${pct}%`;

    localStorage.setItem(`econ_scroll_pct_${currentSubId}`, pct);
    localStorage.setItem(`econ_scroll_pos_${currentSubId}`, window.scrollY);
  });

  const savedPos = localStorage.getItem(`econ_scroll_pos_${currentSubId}`);
  if (savedPos) {
    setTimeout(() => {
      window.scrollTo({ top: parseFloat(savedPos), behavior: "smooth" });
    }, 250);
  }
}

/* Zero-Lag Highlighter Engine + Undo / Redo */
let undoStack = [];
let redoStack = [];

function setupTextHighlighterEngine() {
  const popup = document.getElementById("highlight-popup");
  if (!popup) return;

  const path = window.location.pathname;
  const currentSubId = path.split("/").slice(-2)[0] || "general";

  let savedRange = null;
  let popupInteraction = false;

  // Position popup directly above selection and preserve the selected range
  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (popupInteraction) return;

    if (sel.isCollapsed || !sel.toString().trim()) {
      popup.style.display = "none";
      savedRange = null;
      return;
    }
    const range = sel.getRangeAt(0);
    savedRange = range.cloneRange();
    const rect = range.getBoundingClientRect();
    popup.style.top = `${rect.top + window.scrollY - 52}px`;
    popup.style.left = `${Math.max(10, rect.left + window.scrollX - 40)}px`;
    popup.style.display = "flex";
  });

  popup.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".color-dot, .pop-btn")) {
      popupInteraction = true;
      e.preventDefault();
      setTimeout(() => { popupInteraction = false; }, 50);
    }
  });

  function getFormattedTimestamp() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  }

  function getNoteStorageKey() {
    return `econ_shortnotes_${currentSubId}`;
  }

  function loadNotes() {
    return JSON.parse(localStorage.getItem(getNoteStorageKey()) || "[]");
  }

  function saveNotes(notes) {
    localStorage.setItem(getNoteStorageKey(), JSON.stringify(notes));
  }

  function createStyledSpan(noteId, type, styleVal) {
    const span = document.createElement("span");
    span.id = noteId;
    if (type === "highlight") {
      const finalStyle = styleVal || "yellow";
      span.className = `econ-hl-${finalStyle}`;
    } else if (type === "underline") {
      span.className = "econ-underline";
    } else if (type === "strikethrough") {
      span.className = "econ-strikethrough";
    } else {
      span.className = "econ-hl-yellow";
    }
    return span;
  }

  function wrapRange(range, noteItem) {
    const span = createStyledSpan(noteItem.id, noteItem.type, noteItem.style);
    try {
      range.surroundContents(span);
    } catch (error) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
  }

  function findTextMatch(text) {
    const elements = document.querySelectorAll("p, li, h1, h2, h3, span, div, blockquote, td");
    const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();

    for (const el of elements) {
      const elText = el.textContent.trim().replace(/\s+/g, " ").toLowerCase();
      const index = elText.indexOf(normalized);
      if (index !== -1) {
        let charCount = 0;
        for (const node of el.childNodes) {
          if (node.nodeType !== Node.TEXT_NODE) {
            charCount += node.textContent.length;
            continue;
          }
          const nodeText = node.nodeValue.replace(/\s+/g, " ");
          const nodeLen = nodeText.length;
          if (charCount + nodeLen >= index) {
            const offset = index - charCount;
            return { node, idx: offset };
          }
          charCount += nodeLen;
        }
      }
    }
    return null;
  }

  function reapplyNoteHighlight(noteItem) {
    const match = findTextMatch(noteItem.text);
    if (!match) return false;

    const { node, idx } = match;
    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + noteItem.text.length);
    wrapRange(range, noteItem);
    return true;
  }

  function applyHighlight(type, styleVal = "") {
    const highlightRange = savedRange ? savedRange.cloneRange() : null;
    if (!highlightRange) return;

    const selectedText = highlightRange.toString().trim();
    if (!selectedText) return;

    const uniqueId = `hl-span-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const noteItem = {
      id: uniqueId,
      text: selectedText,
      type,
      style: styleVal,
      comment: styleVal === "comment" ? (prompt("Enter short note/comment for this highlighted text:") || "") : "",
      timestamp: getFormattedTimestamp()
    };

    if (type === "comment") {
      noteItem.type = "highlight";
      noteItem.style = "yellow";
    }

    wrapRange(highlightRange, noteItem);

    const notes = loadNotes();
    notes.push(noteItem);
    saveNotes(notes);
    document.dispatchEvent(new CustomEvent('econ-note-updated', { detail: noteItem }));

    undoStack.push(noteItem);
    redoStack = [];

    popup.style.display = "none";
    window.getSelection().removeAllRanges();
    savedRange = null;
  }

  function performUndo() {
    const notes = loadNotes();
    if (notes.length === 0) return alert("Nothing to undo!");

    const lastNote = notes.pop();
    saveNotes(notes);

    const el = document.getElementById(lastNote.id);
    if (el) {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }

    redoStack.push(lastNote);
    popup.style.display = "none";
  }

  function performRedo() {
    if (redoStack.length === 0) return alert("Nothing to redo!");
    const noteToRedo = redoStack.pop();
    const wasReapplied = reapplyNoteHighlight(noteToRedo);
    if (!wasReapplied) {
      alert("Unable to redo this highlight because the original text could not be found.");
      return;
    }

    const notes = loadNotes();
    notes.push(noteToRedo);
    saveNotes(notes);
    undoStack.push(noteToRedo);
    popup.style.display = "none";
  }

  function restoreSavedHighlights() {
    const notes = loadNotes();
    notes.forEach(noteItem => {
      if (!document.getElementById(noteItem.id)) {
        reapplyNoteHighlight(noteItem);
      }
    });
  }

  restoreSavedHighlights();

  popup.addEventListener("click", (e) => {
    const dot = e.target.closest(".color-dot");
    if (dot) applyHighlight("highlight", dot.dataset.color);
    if (e.target.closest("#pop-underline")) applyHighlight("underline");
    if (e.target.closest("#pop-strike")) applyHighlight("strikethrough");
    if (e.target.closest("#pop-comment")) applyHighlight("comment");
    if (e.target.closest("#pop-undo")) performUndo();
    if (e.target.closest("#pop-redo")) performRedo();
  });

  restoreSavedHighlights();
}

/* Short Notes Drawer with Click-to-Redirect & Date+Time */
function setupShortNotesDrawer() {
  if (document.querySelector(".dashboard-body")) return;
  ensureNotesDrawerMarkup();
  const drawer = document.getElementById("notes-drawer");
  if (!drawer) return;

  const path = window.location.pathname;
  const currentSubId = path.split("/").slice(-2)[0] || "general";
  const container = document.getElementById("drawer-notes-list");

  function renderNotes() {
    if (!container) return;
    container.innerHTML = "";
    const notes = JSON.parse(localStorage.getItem(`econ_shortnotes_${currentSubId}`) || "[]");
    
    if (notes.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:2rem;">No highlights or short notes saved yet.<br>Select any text to highlight!</div>`;
      return;
    }

    const normalizedNotes = notes.map(note => ({
      ...note,
      timestamp: note.timestamp || note.savedAt || getFormattedTimestamp()
    }));

    normalizedNotes.forEach((item) => {
      const card = document.createElement("div");
      card.className = "note-item-card";
      card.innerHTML = `
        <div class="note-card-text">"${item.text}"</div>
        ${item.comment ? `<div class="note-item-comment">💡 Note: ${item.comment}</div>` : ''}
        <div class="note-item-time">🕒 ${item.timestamp}</div>
      `;

      // REDIRECT FUNCTIONALITY: Click on card scrolls to the exact highlighted element
      card.addEventListener("click", () => {
        drawer.classList.remove("active");

        const targetSpan = document.getElementById(item.id);
        if (targetSpan) {
          targetSpan.scrollIntoView({ behavior: "smooth", block: "center" });
          targetSpan.classList.add("search-highlight-pulse");
          setTimeout(() => targetSpan.classList.remove("search-highlight-pulse"), 2500);
        } else {
          // Fallback search by text content if ID missing
          const allSpans = Array.from(document.querySelectorAll("span, p, h1, h2, h3"));
          const match = allSpans.find(el => el.textContent.includes(item.text));
          if (match) {
            match.scrollIntoView({ behavior: "smooth", block: "center" });
            match.classList.add("search-highlight-pulse");
            setTimeout(() => match.classList.remove("search-highlight-pulse"), 2500);
          }
        }
      });

      container.appendChild(card);
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#open-notes-btn")) {
      drawer.classList.add("active");
      renderNotes();
    }
    if (e.target.closest("#close-drawer-btn")) {
      drawer.classList.remove("active");
    }
  });

  document.addEventListener('econ-note-updated', () => {
    if (drawer.classList.contains('active')) {
      renderNotes();
    }
  });

  document.getElementById("btn-download-txt")?.addEventListener("click", () => {
    const notes = JSON.parse(localStorage.getItem(`econ_shortnotes_${currentSubId}`) || "[]");
    if (notes.length === 0) return alert("No notes to export!");
    let content = `=== SHORT NOTES: ${currentSubId.toUpperCase()} ===\n\n`;
    notes.forEach((n, i) => {
      content += `${i+1}. "${n.text}"\n${n.comment ? ' Note: ' + n.comment : ''}\n Saved: ${n.timestamp}\n\n`;
    });
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentSubId}-ShortNotes.txt`;
    a.click();
  });
}