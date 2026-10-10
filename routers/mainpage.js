// Short links. The pages themselves are the React website (frontend/src/site).
const express = require("express");
const router = express.Router();

router.get("/invite", function(req, res) {
  res.redirect(require("../web/discord").inviteUrl());
});
router.get("/server", function(req, res) {
  res.redirect("https://discord.gg/PnUYnBbxER");
});
router.get("/plus", function(req, res) {
  res.redirect("https://patreon.com/sylveondev");
});
router.get("/github", function(req, res) {
  res.redirect("https://github.com/team-custard/phoenixbot");
});

module.exports = router;
