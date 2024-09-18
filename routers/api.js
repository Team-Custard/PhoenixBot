const express = require("express");
const UserDB = require("../tools/UserDB");
const serverSettings = require("../tools/SettingsSchema");
const { request } = require("undici");
const { container } = require("@sapphire/framework")
const settings = require("../config.json");

const router = express.Router();

router.use(express.json());

router.get("/api/login", async (req, res) => {
  const { code, branch } = req.query;
  if (!code) return res.status(400).send("Malformed url");
  await request(
    "https://discord.com/api/oauth2/token",
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: branch == 'test' ? "1239263616025493504" : settings.dashboard.clientid,
        client_secret: branch == 'test' ? process.env["TESTSECRET"] : process.env[`CLIENTSECRET`],
        code,
        grant_type: "authorization_code",
        redirect_uri: `${settings.dashboard.devmode == true ? "http://localhost:8080" : settings.dashboard.fullredirecturl}/api/login`,
        scope: "applications.commands+bot",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  ).then(async (r) => {
    if (r.statusCode != 200) {
      console.log(await r.body.json());
      return res.sendStatus(r.statusCode);
    }
    res.redirect(`/success`);
  })
  .catch(() => res.status(500).send("Bot add failed"));
})

router.post("/api/utilities/activate", 
  /**
   * 
   * @param {Request} req 
   * @param {Response} res 
   */
  async function (req, res) {
    const pubkey = req.body.pubkey;
    const serverid = req.body.server;
    if (pubkey !== process.env["UTILSPUBKEY"]) return res.status(400).send(`The public key for your extension is invalid. Unfortunately you cannot use custom extension self hosts with Phoenix yet, however it is planned soon. Join the [Phoenix support server](https://discord.gg/PnUYnBbxER ) for more info on that`);
    const guild = await container.client.guilds.fetch(serverid)
    .catch(async () => {
      await res.status(400).send(`The selected bot is not in the server. Make sure you selected the right branch`);
      throw "Utiltiies post failed, bot not in server";
    })
    try {
      const db = await serverSettings
        .findById(message.guild.id, serverSettings.upsert)
        .cacheQuery();

      db.utilities = true
      await db.save();
      await res.status(200).send("Success");
    } catch (err) {
      await res.status(400).send(`Unknown error, ${err}`);
    }
    
    
});

router.get("/api/timefor/:id", async function (req, res) {
  const member = req.params.id;
  const usersettings = await UserDB.findById(
    member,
    UserDB.upsert,
  ).cacheQuery();
  if (!usersettings) {
    return res.send({ status: 400, message: "User have not setup UserDB." });
  }
  if (!usersettings.timezone) {
    return res.send({
      status: 400,
      message: "User does not have timezone setup.",
    });
  }

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
  if (!usersettings) {
    return res.send({ status: 400, message: "User have not setup UserDB." });
  }
  if (!usersettings.pronouns) {
    return res.send({
      status: 400,
      message: "User does not have pronouns setup.",
    });
  }

  await res.send({ status: 200, id: member, pronouns: usersettings.pronouns });
});

router.get("/api/socials/:id", async function (req, res) {
  const member = req.params.id;
  const usersettings = await UserDB.findById(
    member,
    UserDB.upsert,
  ).cacheQuery();
  if (!usersettings) {
    return res.send({ status: 400, message: "User have not setup UserDB." });
  }

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
  if (!usersettings) {
    return res.send({ status: 400, message: "User have not setup UserDB." });
  }

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
