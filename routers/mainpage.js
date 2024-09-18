const express = require("express");
const settings = require("../config.json");
const router = express.Router();

router.get("/", function (req, res) {
  res.render("pages/home", { title: "Home" });
});
router.get("/userdb/tzhelp", function (req, res) {
  res.render("pages/userdb/timezone", { title: "Your timezone" });
});
router.get("/commands", function (req, res) {
  res.render("pages/commands", { title: "Commands" });
});
router.get("/sexy", function (req, res) {
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

router.get("/invite", function (req, res) {
  res.redirect(
    `https://discord.com/oauth2/authorize?client_id=1239263616025493504&permissions=${settings.dashboard.clientid}&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Flogin&integration_type=0&scope=applications.commands+bot${settings.process.botmode == "test" ? `&branch=test` : ``}`,
  );
});
router.get("/server", function (req, res) {
  res.redirect("https://discord.gg/PnUYnBbxER");
});
router.get("/plus", function (req, res) {
  res.redirect("https://patreon.com/sylveondev");
});

router.get("/terms", function (req, res) {
  res.render(`pages/terms`, { title: "Terms of service" });
});

router.get("/privacy", function (req, res) {
  res.render(`pages/privacy`, { title: "Privacy policy" });
});

router.get("/errors/:id", function (req, res) {
  res.render(`errors/${req.params.id}`, { title: "Error page" });
});

router.get("/success", function (req, res) {
  res.render(`pages/success`, { title: "Invited" });

})

module.exports = router;
