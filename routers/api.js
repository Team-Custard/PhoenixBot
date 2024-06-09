const express = require("express");
const UserDB = require("../tools/UserDB");

const router = express.Router();

router.get("/api/timefor/:id", async function (req, res) {
  const member = req.params.id;
  const usersettings = await UserDB.findById(
    member,
    UserDB.upsert,
  ).cacheQuery();
  if (!usersettings)
    return res.send({ status: 400, message: "User have not setup UserDB." });
  if (!usersettings.timezone)
    return res.send({
      status: 400,
      message: "User does not have timezone setup.",
    });

  const moment = require("moment-timezone");
  const date = new Date();
  const strTime = moment(date).tz(usersettings.timezone).format("hh:mm:ss");
  const strDate = moment(date).tz(usersettings.timezone).format("MM-DD-YYYY");
  await res.send({ status: 200, id: member, time: strTime, date: strDate });
});

router.get("/api/pronouns/:id", async function (req, res) {
  const member = req.params.id;
  const usersettings = await UserDB.findById(
    member,
    UserDB.upsert,
  ).cacheQuery();
  if (!usersettings)
    return res.send({ status: 400, message: "User have not setup UserDB." });
  if (!usersettings.pronouns)
    return res.send({
      status: 400,
      message: "User does not have pronouns setup.",
    });

  await res.send({ status: 200, id: member, pronouns: usersettings.pronouns });
});

router.get("/api/socials/:id", async function (req, res) {
  const member = req.params.id;
  const usersettings = await UserDB.findById(
    member,
    UserDB.upsert,
  ).cacheQuery();
  if (!usersettings)
    return res.send({ status: 400, message: "User have not setup UserDB." });

  await res.send({
    status: 200,
    id: member,
    youtube: usersettings.socials.youtube,
    twitter: usersettings.socials.twitter,
    reddit: usersettings.socials.reddit,
    server: usersettings.socials.server,
  });
});

router.get("/api/profile/:id", async function (req, res) {
  const member = req.params.id;
  const usersettings = await UserDB.findById(
    member,
    UserDB.upsert,
  ).cacheQuery();
  if (!usersettings)
    return res.send({ status: 400, message: "User have not setup UserDB." });

  await res.send({
    status: 200,
    id: member,
    timezone: usersettings.timezone,
    pronouns: usersettings.pronouns,
    description: usersettings.description,
    socials: {
      youtube: usersettings.socials.youtube,
      twitter: usersettings.socials.twitter,
      reddit: usersettings.socials.reddit,
      server: usersettings.socials.server,
    },
    afk: { reason: usersettings.afk.status, timestamp: usersettings.afk.since },
  });
});

router.get("/api", async function (req, res) {
  res.render("pages/api", { title: "Api reference" });
});

module.exports = router;
