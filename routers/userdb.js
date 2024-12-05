const express = require("express");
const UserDB = require("../tools/UserDB");
const { container } = require("@sapphire/framework");

const router = express.Router();

router.get("/u/:id", async function (req, res) {
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

  const user = await container.client.users.fetch(member);
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
