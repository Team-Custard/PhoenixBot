const settings = require("../config.json");
const express = require("express");
const { request } = require("undici");

const router = express.Router();

const serverSettings = require("../tools/SettingsSchema");

// Request hostname is temporarily stored here in a cache to prevent mass requests.
// This is deleted every 30 minutes or until the user logs out.
// The entire cache is also wiped if the bot process dies.
const tempStorage = [];

router.get("/dash/login", async function (req, res) {
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
      console.log("Dash login success");

      if (!oauthData["access_token"]) {
        // There is no access token. An error occured.
        return res.render("errors/500", { title: "Error" });
      }

      const foundHost = tempStorage.find(
        (i) => i.hostname == req.ip + req.hostname,
      );

      if (foundHost) {
        foundHost.accessToken = oauthData["access_token"];
        foundHost.tokenType = oauthData["token_type"];
      } else {
        // The user has accepted the Discord oauth2 and a granter token was generated.
        // The token will be stored in a temporary and private cache binded by ip and
        // device host so we don't keep getting rate limited by Discord. This will do.
        // It clears when the user logs off, 30 minutes passes, or if the bot crashes.
        tempStorage.push({
          hostname: req.ip + req.hostname,
          accessToken: oauthData["access_token"],
          tokenType: oauthData["token_type"],
          guilds: null,
          users: null,
        });
      }
      // Clear the cache after half an hour for security and to free ram usage.
      setTimeout(async function () {
        // Run checks first to see if the user didn't already log out beforehand.
        const refoundHost = tempStorage.find(
          (i) => i.hostname == req.ip + req.hostname,
        );
        if (!refoundHost) {
          return;
        }

        try {
          // Make an api to discord to destroy the bearer token.
          // We don't want it existing anymore.
          await request("https://discord.com/api/oauth2/token/revoke", {
            method: "POST",
            body: new URLSearchParams({
              token: refoundHost.accessToken,
            }).toString(),
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });

          // And now we actually remove it from the cache since everything passed.
          for (let i = 0, j = tempStorage.length; i < j; i++) {
            if (tempStorage[i]) {
              if (tempStorage.hostname == req.ip + req.hostname) {
                tempStorage.splice(i, 1);
              }
            }
          }
          console.log("Dash cache cleared for a member. gg devs.");
        } catch (err) {
          console.error(err);
        }
      }, 1800000);
      res.redirect("/dash");
    } catch (err) {
      console.error(err);
      return res.render("errors/500", { title: "Error" });
    }
  } else {
    res.redirect("/");
  }
});

router.get("/dash/end", async function (req, res) {
  const foundHost = tempStorage.find(
    (i) => i.hostname == req.ip + req.hostname,
  );
  if (!foundHost) {
    return res.redirect("/");
  }

  try {
    // Make an api to discord to destroy the bearer token.
    // We don't want it existing anymore.
    await request("https://discord.com/api/oauth2/token/revoke", {
      method: "POST",
      body: new URLSearchParams({
        token: foundHost.accessToken,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // And now we actually remove it from the cache since everything passed.
    for (let i = 0, j = tempStorage.length; i < j; i++) {
      if (tempStorage[i]) {
        if (tempStorage.hostname == req.ip + req.hostname) {
          tempStorage.splice(i, 1);
        }
      }
    }
    console.log("Dash cache cleared for a member. gg devs.");

    return res.redirect("/");
  } catch (err) {
    console.error(err);
    return res.render("errors/500", { title: "Error" });
  }
});

router.get("/dash/redirect", function (req, res) {
  res.redirect(
    `https://discord.com/oauth2/authorize?client_id=${settings.dashboard.clientid}&response_type=code&redirect_uri=${settings.dashboard.devmode ? "http://localhost:8080" : settings.dashboard.fullredirecturl}/dash/login&scope=guilds+guilds.members.read+identify`,
  );
});

router.get("/dash", async function (req, res) {
  const foundHost = tempStorage.find(
    (i) => i.hostname == req.ip + req.hostname,
  );
  if (!foundHost) {
    return res.redirect("/dash/redirect");
  }
  let userinfo;
  let guildinfo;
  if (!foundHost.users) {
    const userResult = await request("https://discord.com/api/users/@me", {
      headers: {
        authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
      },
    });
    userinfo = await userResult.body.json();
    foundHost.users = userinfo;
  } else {
    userinfo = foundHost.users;
  }
  if (!foundHost.guilds) {
    const guildResult = await request(
      "https://discord.com/api/users/@me/guilds",
      {
        headers: {
          authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
        },
      },
    );
    guildinfo = await guildResult.body.json();
    foundHost.guilds = guildinfo;
  } else {
    guildinfo = foundHost.guilds;
  }

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
  async function (req, res) {
    // console.log(req.body);
    const foundHost = tempStorage.find(
      (i) => i.hostname == req.ip + req.hostname,
    );
    if (!foundHost) {
      return res.redirect("/dash/redirect");
    }

    let guildinfo;
    if (!foundHost.guilds) {
      const guildResult = await request(
        "https://discord.com/api/users/@me/guilds",
        {
          headers: {
            authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
          },
        },
      );
      guildinfo = await guildResult.body.json();
      foundHost.guilds = guildinfo;
    } else {
      guildinfo = foundHost.guilds;
    }

    if (guildinfo.message) {
      setTimeout(() => {
        res.redirect(req.url);
      }, 3000);
    } else {
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

router.get("/dash/servers/:server", async function (req, res) {
  const foundHost = tempStorage.find(
    (i) => i.hostname == req.ip + req.hostname,
  );
  if (!foundHost) {
    return res.redirect("/dash/redirect");
  }

  let guildinfo;
  if (!foundHost.guilds) {
    const guildResult = await request(
      "https://discord.com/api/users/@me/guilds",
      {
        headers: {
          authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
        },
      },
    );
    guildinfo = await guildResult.body.json();
    foundHost.guilds = guildinfo;
  } else {
    guildinfo = foundHost.guilds;
  }

  if (guildinfo.message) {
    setTimeout(() => {
      res.redirect(req.url);
    }, 3000);
  } else {
    const chosenguild = await guildinfo.find((g) => g.id == req.params.server);
    if (chosenguild) {
      const permissions = require("discord-perms-array")(
        chosenguild.permissions,
      );
      if (permissions.includes("MANAGE_GUILD")) {
        const db = await serverSettings.findById(chosenguild.id).cacheQuery();

        let invitebanner;
        if (require("../config.json").process.botclient) {
          const fetchedguild = await require("../bot")
            .client.guilds.fetch(chosenguild.id)
            .catch(() => undefined);
          if (!fetchedguild) {
            return res.redirect(
              `https://discord.com/oauth2/authorize?client_id=${settings.process.botmode == "prod" ? settings.dashboard.clientid : settings.dashboard.stageid}&permissions=52224&response_type=code&redirect_uri=${settings.dashboard.devmode ? "http://localhost:8080" : settings.dashboard.fullredirecturl}/dash&scope=bot+applications.commands&guild_id=${chosenguild.id}&disable_guild_select=true`,
            );
          }

          invitebanner = fetchedguild.splashURL({
            size: 4096,
            extension: "png",
          });
        }

        if (!db) {
          return res.redirect(
            `/dash?errormsg=Aw shucks, you caught a rare bug. There's a problem with the database to ${chosenguild.name}. It usually happens if you invite the bot while it is offline. In your server, run /stats dbfix to attempt to fix the database and try again.`,
          );
        }

        res.render("pages/serverconf", {
          title: "Server config",
          config: db,
          server: chosenguild,
          background: invitebanner,
          subStat: req.query.status ? req.query.status : "",
        });
      } else {
        res.redirect(
          `/dash?errormsg=Whoops, you're missing permissions in ${chosenguild.name} to manage the bot! Ask the sever owner for help.`,
        );
      }
    } else {
      res.status(404);
      res.render("errors/404", { title: "Not found" });
    }
  }
});

router.get("/dash/error", function (req, res) {
  res.render("errors/500", { title: "Error" });
});

module.exports = router;
