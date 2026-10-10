// The website: public pages (EJS), the public API, and the React dashboard.
// Runs inside cluster 0 of the bot (see bot.js), or on its own in dashboard-only mode.
const fs = require("fs");
const path = require("path");
const express = require("express");
const { settings, dashboard, botmode } = require("./tools/config");
const { loadSession } = require("./web/session");

const app = express();
// The EJS header reads this to show which bot (prod/dev/test) the site belongs to.
global.bottype ??= botmode;
const DASHBOARD_DIST = path.join(__dirname, "dashboard", "dist");

app.set("view engine", "ejs");
app.disable("x-powered-by");
// Behind Cloudflare / nginx in production, so req.secure and req.ip are correct.
if (!dashboard.devmode) app.set("trust proxy", dashboard.trustProxy ?? 1);

// Redirect to HTTPS before anything else (this used to run after the routes, so it never did).
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

app.use("/jquery", express.static(path.join(__dirname, "node_modules/jquery/dist/")));
app.use("/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap/dist/")));
app.use("/bootstrap-select", express.static(path.join(__dirname, "node_modules/bootstrap-select/dist/")));
app.use(express.static(path.join(__dirname, "static")));
app.use(express.urlencoded({ extended: false }));

// Public pages and API.
app.use(require("./routers/mainpage"));
app.use(require("./routers/api"));
app.use(require("./routers/userdb"));

// Dashboard: login routes, JSON API and the React app.
app.use(loadSession);
app.use(require("./web/auth"));
app.use("/api/dashboard", require("./web/api"));
app.use("/dash/assets", express.static(path.join(DASHBOARD_DIST, "assets"), { maxAge: "7d", immutable: true }));
app.get(["/dash", "/dash/*"], (req, res) => {
  const index = path.join(DASHBOARD_DIST, "index.html");
  if (!fs.existsSync(index)) {
    return res.status(503).type("txt").send("The dashboard hasn't been built yet. Run `npm run build:dashboard`.");
  }
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(index);
});

app.use((req, res) => {
  res.status(404);
  if (req.accepts("html")) return res.render("errors/404", { title: "Not found", url: req.url });
  if (req.accepts("json")) return res.json({ error: "Not found" });
  res.type("txt").send("Not found");
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[web] Unhandled error", err);
  res.status(500);
  if (req.accepts("html")) return res.render("errors/500", { title: "Error" });
  res.json({ error: "Server error" });
});

const port = dashboard.serverport ?? 8080;
app.listen(port, () => console.log("Dashboard is ready. Listening at localhost:%d", port));

module.exports = { app, settings };
