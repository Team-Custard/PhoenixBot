// The website: the React site and dashboard (frontend/), the dashboard API and the
// public API. Runs inside cluster 0 of the bot (see bot.js), or on its own in
// dashboard-only mode.
const fs = require("fs");
const path = require("path");
const express = require("express");
const { settings, dashboard } = require("./tools/config");
const { loadSession } = require("./web/session");

const app = express();
const FRONTEND_DIST = path.join(__dirname, "frontend", "dist");
const INDEX = path.join(FRONTEND_DIST, "index.html");

// Pages the React app knows. Anything else gets the app's "not found" page with a 404.
const PAGES = [
  /^\/$/,
  /^\/commands\/?$/,
  /^\/leaderboard\/\d{17,20}\/?$/,
  /^\/u\/[^/]+\/?$/,
  /^\/userdb\/tzhelp\/?$/,
  /^\/userdb\/?$/,
  /^\/api\/?$/,
  /^\/terms\/?$/,
  /^\/privacy\/?$/,
  /^\/success\/?$/,
  /^\/dash(\/.*)?$/,
];

app.disable("x-powered-by");
// Behind Cloudflare / nginx in production, so req.secure and req.ip are correct.
if (!dashboard.devmode) app.set("trust proxy", dashboard.trustProxy ?? 1);

// Redirect to HTTPS before anything else.
app.use((req, res, next) => {
  if (!dashboard.devmode && !req.secure) return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  next();
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.path.startsWith("/dash")) res.setHeader("X-Frame-Options", "DENY");
  next();
});

app.use(express.static(path.join(__dirname, "static")));
app.use("/assets", express.static(path.join(FRONTEND_DIST, "assets"), { maxAge: "7d", immutable: true }));

// Dashboard: login routes and JSON API.
app.use(["/dash", "/api/dashboard"], loadSession);
app.use(require("./web/auth"));
app.use("/api/dashboard", require("./web/api"));

// Public API and short links.
app.use(require("./routers/public"));
app.use(require("./routers/api"));
app.use(require("./routers/mainpage"));

// Everything else that wants a web page gets the React app.
app.get("*", (req, res, next) => {
  if (!req.accepts("html") || req.path.startsWith("/api/")) return next();
  if (!fs.existsSync(INDEX)) {
    return res.status(503).type("txt").send("The website hasn't been built yet. Run `npm run build:web`.");
  }
  res.setHeader("Cache-Control", "no-cache");
  res.status(PAGES.some((page) => page.test(req.path)) ? 200 : 404).sendFile(INDEX);
});

app.use((req, res) => {
  res.status(404);
  if (req.accepts("json")) return res.json({ error: "Not found" });
  res.type("txt").send("Not found");
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[web] Unhandled error", err);
  res.status(500).json({ error: "Server error" });
});

const port = dashboard.serverport ?? 8080;
app.listen(port, () => console.log("Website is ready. Listening at localhost:%d", port));

module.exports = { app, settings };
