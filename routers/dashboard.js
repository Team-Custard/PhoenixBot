const settings = require("../config.json");
const express = require("express");
const { request } = require("undici");

const router = express.Router();

const serverSettings = require("../tools/SettingsSchema");

// Request hostname is temporarily stored here to save discord tokens.
// These are wiped when the app restarts.
const tempStorage = [];

router.get("/dash/login", async function(req, res) {
  const { code } = req.query;
  if (code) {
    try {
      const tokenResponseData = await request(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          body: new URLSearchParams({
            client_id: settings.dashboard.clientid,
            client_secret: process.env["CLIENTSECRET"],
            code,
            grant_type: "authorization_code",
            redirect_uri: `${settings.dashboard.devmode == true ? "http://localhost:8080" : settings.dashboard.fullredirecturl}/dash/login`,
            scope: "guilds+identify",
          }).toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const oauthData = await tokenResponseData.body.json();
      // console.log(oauthData);

      if (!oauthData["access_token"]) {
        // There is no access token. An error occured.
        return res.render("errors/500", { title: "Error" });
      }

      const foundHost = tempStorage.find((i) => i.hostname == req.ip);

      if (foundHost) {
        foundHost.accessToken = oauthData["access_token"];
        foundHost.tokenType = oauthData["token_type"];
      }
 else {
        tempStorage.push({
          hostname: req.ip,
          accessToken: oauthData["access_token"],
          tokenType: oauthData["token_type"],
        });
      }

      res.redirect("/dash");
    }
 catch (err) {
      console.error(err);
      return res.render("errors/500", { title: "Error" });
    }
  }
 else {
    res.redirect("/");
  }
});

router.get("/dash/end", async function(req, res) {
  const foundHost = tempStorage.find((i) => i.hostname == req.ip);
  if (!foundHost) {
    return res.redirect("/");
  }

  try {
    await request("https://discord.com/api/oauth2/token/revoke", {
      method: "POST",
      body: new URLSearchParams({
        token: foundHost.accessToken,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    for (let i = 0, j = tempStorage.length; i < j; i++) {
      if (tempStorage[i]) {
        if (tempStorage.hostname == req.ip) {
          tempStorage.splice(i, 1);
        }
      }
    }

    return res.redirect("/");
  }
 catch (err) {
    console.error(err);
    return res.render("errors/500", { title: "Error" });
  }
});

router.get("/dash/redirect", function(req, res) {
  res.redirect(
    `https://discord.com/oauth2/authorize?client_id=${settings.dashboard.clientid}&response_type=code&redirect_uri=${settings.dashboard.devmode ? "http://localhost:8080" : settings.dashboard.fullredirecturl}/dash/login&scope=guilds+guilds.members.read+identify`,
  );
});

router.get("/dash", async function(req, res) {
  const foundHost = tempStorage.find((i) => i.hostname == req.ip);
  if (!foundHost) {
    return res.redirect("/dash/redirect");
  }

  const userResult = await request("https://discord.com/api/users/@me", {
    headers: {
      authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
    },
  });
  const guildResult = await request(
    "https://discord.com/api/users/@me/guilds",
    {
      headers: {
        authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
      },
    },
  );

  const userinfo = await userResult.body.json();
  const guildinfo = await guildResult.body.json();

  console.log(guildinfo);
  let servers;
  if (!guildinfo.message) {
    servers = guildinfo.map((g) => ({
      id: g.id,
      icon: g.icon,
      title: g.name,
      permissions: g.permissions,
    }));
  }
  res.render("pages/dash", {
    title: "Dashboard",
    guilderror: req.query.errormsg ? req.query.errormsg : "",
    username: userinfo.username,
    usericon: `https://cdn.discordapp.com/avatars/${userinfo.id}/${userinfo.avatar}.png?size=128`,
    guilds: servers,
  });
});

router.post(
  "/dash/servers/:server",
  require("body-parser").urlencoded({ extended: false }),
  async function(req, res) {
    console.log(req.body);
    const foundHost = tempStorage.find((i) => i.hostname == req.ip);
    if (!foundHost) {
      return res.redirect("/dash/redirect");
    }

    const guildResult = await request(
      "https://discord.com/api/users/@me/guilds",
      {
        headers: {
          authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
        },
      },
    );
    const guildinfo = await guildResult.body.json();

    if (guildinfo.message) {
      setTimeout(() => {
        res.redirect(req.url);
      }, 3000);
    }
 else {
      const chosenguild = await guildinfo.find(
        (g) => g.id == req.params.server,
      );
      if (chosenguild) {
        const permissions = require("discord-perms-array")(
          chosenguild.permissions,
        );
        if (permissions.includes("MANAGE_GUILD")) {
          const db = await serverSettings.findById(chosenguild.id).cacheQuery();
          for (const param in req.body) {
            switch (param) {
              case "prefix": {
                let newprefix = req.body[param];
                if (req.body[param].length > 6) {
                  newprefix = req.body[param].substring(0, 5);
                }
                if (req.body[param].length < 1) newprefix = "=";
                db.prefix = newprefix;
                break;
              }
              case "stagingprefix": {
                let newprefix = req.body[param];
                if (req.body[param].length > 6) {
                  newprefix = req.body[param].substring(0, 5);
                }
                if (req.body[param].length < 1) newprefix = "==";
                db.stagingprefix = newprefix;
                break;
              }
            }
          }

          // Checkboxes must be set outside for loop as disabled checkboxes don't send anything.
          const newlock = req.body["lockTags"] == "on" ? true : false;
          db.lockTags = newlock;

          await db
            .save()
            .then(() => {
              res.redirect(req.url + "?status=okay");
            })
            .catch(() => {
              res.redirect(req.url + "?status=error");
            });
        }
      }
    }
  },
);

router.get("/dash/servers/:server", async function(req, res) {
  const foundHost = tempStorage.find((i) => i.hostname == req.ip);
  if (!foundHost) {
    return res.redirect("/dash/redirect");
  }

  const guildResult = await request(
    "https://discord.com/api/users/@me/guilds",
    {
      headers: {
        authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
      },
    },
  );

  const guildinfo = await guildResult.body.json();

  if (guildinfo.message) {
    setTimeout(() => {
      res.redirect(req.url);
    }, 3000);
  }
 else {
    const chosenguild = await guildinfo.find((g) => g.id == req.params.server);
    if (chosenguild) {
      const permissions = require("discord-perms-array")(
        chosenguild.permissions,
      );
      if (permissions.includes("MANAGE_GUILD")) {
        const db = await serverSettings.findById(chosenguild.id).cacheQuery();
        if (!db) {
          return res.redirect(
            `https://discord.com/oauth2/authorize?client_id=${settings.dashboard.clientid}&permissions=52224&response_type=code&redirect_uri=${settings.dashboard.devmode ? "http://localhost:8080" : settings.dashboard.fullredirecturl}/dash&scope=bot+applications.commands&guild_id=${chosenguild.id}&disable_guild_select=true`,
          );
        }

        let invitebanner;
        if (require("../config.json").process.botclient) {
          const fetchedguild = await require("../bot")
            .client.guilds.fetch(chosenguild.id)
            .catch(() => undefined);
          if (!fetchedguild) {
            return res.redirect(
              `https://discord.com/oauth2/authorize?client_id=${settings.dashboard.clientid}&permissions=52224&response_type=code&redirect_uri=${settings.dashboard.devmode ? "http://localhost:8080" : settings.dashboard.fullredirecturl}/dash&scope=bot+applications.commands&guild_id=${chosenguild.id}&disable_guild_select=true`,
            );
          }

          invitebanner = fetchedguild.splashURL({
            size: 4096,
            extension: "png",
          });
        }

        res.render("pages/serverconf", {
          title: "Server config",
          config: db,
          server: chosenguild,
          background: invitebanner,
          subStat: req.query.status ? req.query.status : "",
        });
      }
 else {
        res.redirect(
          `/dash?errormsg=Looks like you don't have permission to manage the bot in ${chosenguild.name}. You must have manage server perms to access this server's dashboard. Ask the server owner for help or select another server.`,
        );
      }
    }
 else {
      res.status(404);
      res.render("errors/404", { title: "Not found" });
    }
  }
});

router.get("/dash/error", function(req, res) {
  res.render("errors/500", { title: "Error" });
});

module.exports = router;
