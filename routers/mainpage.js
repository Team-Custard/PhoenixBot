const express = require("express");

const router = express.Router();

router.get("/", function(req, res) {
  res.render("pages/home", { title: "Home" });
});
router.get("/userdb/tzhelp", function(req, res) {
  res.render("pages/userdb/timezone", { title: "Your timezone" });
});
router.get("/server", function(req, res) {
  res.redirect("https://discord.gg/PnUYnBbxER");
});
router.get("/commands", function(req, res) {
  res.render("pages/commands", { title: "Commands" });
});
router.get("/sexy", function(req, res) {
  res.status(403);
  if (req.accepts("html")) {
    res.render("errors/403", { title: "Forbidden", url: req.url });
    return;
  }
  if (req.accepts("json")) {
    res.json({ error: "Forbidden" });
    return;
  }
  res.type("txt").send("Forbidden");
});

router.get("/invite", function(req, res) {
  res.redirect(
    "https://discord.com/oauth2/authorize?client_id=1171286616967479377",
  );
});

router.get("/errors/:id", function(req, res) {
  res.render(`errors/${req.params.id}`, { title: "Error page" });
});

module.exports = router;
