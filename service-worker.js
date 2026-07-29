const CACHE_NAME = "econ-notes-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/config.js",
  "/styles.css",
  "/theme.js",
  "/app.js",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Dynamic runtime injection into Notion HTML pages
  if (e.request.destination === "document" && url.pathname.endsWith(".html") && !url.pathname.endsWith("index.html") && url.pathname.includes("subjects/")) {
    e.respondWith(
      fetch(e.request)
        .then(async (response) => {
          let html = await response.text();
          const injection = `
            <link rel="stylesheet" href="/styles.css">
            <script src="/theme.js" defer></script>
            <script src="/app.js" defer></script>
          </head>`;
          html = html.replace("</head>", injection);

          const drawerHTML = `
            <div id="notes-drawer" class="drawer-backdrop">
              <div class="drawer-content">
                <div class="drawer-header">
                  <h3 style="margin:0;">📝 Subject Short Notes</h3>
                  <button id="close-drawer-btn" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-primary);">✕</button>
                </div>
                <div id="drawer-notes-list" class="notes-list"></div>
                <button id="btn-download-txt" class="btn-icon-text primary" style="width:100%; justify-content:center;">📥 Export Short-Notes (.txt)</button>
              </div>
            </div>
          </body>`;
          html = html.replace("</body>", drawerHTML);

          return new Response(html, { headers: response.headers });
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});