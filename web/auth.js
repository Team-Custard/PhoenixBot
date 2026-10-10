// Login and logout pages for the dashboard. The OAuth redirect URI stays
// <fullredirecturl>/dash/login, which is what's registered with Discord.
const express = require("express");
const { beginLogin, completeLogin, logout } = require("./session");

const router = express.Router();

router.get("/dash/login", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect("/dash?login=cancelled");
  if (!code) return res.redirect(beginLogin(res, req.query.next));
  try {
    const returnTo = await completeLogin(req, res, String(code), String(state ?? ""));
    res.redirect(returnTo);
  }
  catch (err) {
    console.error("[dashboard] Login failed", err.message);
    res.redirect(`/dash?login=failed&reason=${encodeURIComponent(err.status === 400 ? err.message : "Discord didn't accept the login. Try again.")}`);
  }
});

// Old links pointed here.
router.get("/dash/redirect", (req, res) => res.redirect(beginLogin(res, "/dash")));

router.get("/dash/logout", async (req, res) => {
  await logout(req, res);
  res.redirect("/");
});
router.get("/dash/end", (req, res) => res.redirect("/dash/logout"));

module.exports = router;
