const express = require("express");
const UserDB = require("../tools/UserDB");

const router = express.Router();

router.get("/u/:id", async function(req, res) {
  const member = req.params.id;
  const usersettings = await UserDB.findById(
    member,
    UserDB.upsert,
  ).cacheQuery();
  if (!usersettings) {
    return res.status(404).render(`errors/userdb`, {
      title: "Error",
      userdberr:
        "This user was not found in the UserDB database. They may not have setup UserDB yet.",
    });
  }

  // REST works whether or not this process has a bot client (dashboard-only mode).
  const { rest } = require("../web/discord");
  const raw = /^\d{17,20}$/.test(member) ? await rest.get(`/users/${member}`).catch(() => null) : null;
  const user = raw && {
    tag: raw.discriminator && raw.discriminator !== "0" ? `${raw.username}#${raw.discriminator}` : raw.username,
    displayAvatarURL: () => raw.avatar
      ? `https://cdn.discordapp.com/avatars/${raw.id}/${raw.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(raw.id) >> 22n) % 6n)}.png`,
  };
  if (!user) {
    return res.status(404).render(`errors/userdb`, {
      title: "Error",
      userdberr: "This user no longer exists on Discord.",
    });
  }

  await res.render("pages/userdb/page", {
    title: "UserDB",
    uid: member,
    uset: usersettings,
    us: user,
  });
});

module.exports = router;
