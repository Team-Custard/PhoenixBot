const settings = require('../config.json');
const express = require('express');
const { request } = require('undici');

const router = express.Router();

const serverSettings = require('../tools/SettingsSchema');

// Request hostname is temporarily stored here to save discord tokens.
// These are wiped when the app restarts.
const tempStorage = [];

router.get('/dash/login', async function(req, res) {
    const { code } = req.query;
    if (code) {
		try {
			const tokenResponseData = await request('https://discord.com/api/oauth2/token', {
				method: 'POST',
				body: new URLSearchParams({
					client_id: settings.dashboard.clientid,
					client_secret: process.env["CLIENTSECRET"],
					code,
					grant_type: 'authorization_code',
					redirect_uri: `${settings.dashboard.devmode == true ? 'http://localhost:8080' : settings.dashboard.fullredirecturl}/dash/login`,
					scope: 'guilds+identify',
				}).toString(),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			const oauthData = await tokenResponseData.body.json();
			// console.log(oauthData);

            if (!oauthData["access_token"]) {
                // There is no access token. An error occured.
                return res.render('errors/500', { title: 'Error' });
            }

            const foundHost = tempStorage.find(i => i.hostname == req.ip);

            if (foundHost) {
                foundHost.accessToken = oauthData["access_token"];
                foundHost.tokenType = oauthData["token_type"];
            }
            else {
                tempStorage.push({
                    hostname: req.ip,
                    accessToken: oauthData["access_token"],
                    tokenType: oauthData["token_type"]
                });
            }

            res.redirect('/dash');
        }
        catch (err) {
			console.error(err);
            return res.render('errors/500', { title: 'Error' });
		}
	}
    else {
        res.redirect('/');
    }
});

router.get('/dash/end', async function(req, res) {
    const foundHost = tempStorage.find(i => i.hostname == req.ip);
    if (!foundHost) {
        return res.redirect('/');
    }

    try {
        await request('https://discord.com/api/oauth2/token/revoke', {
			method: 'POST',
			body: new URLSearchParams({
				token: foundHost.accessToken,
			}).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

        for (let i = 0, j = tempStorage.length; i < j; i++) {
            if (tempStorage[i]) {
                if (tempStorage.hostname == req.ip) {
                    tempStorage.splice(i, 1);
                }
            }
        }

        return res.redirect('/');
    }
    catch (err) {
        console.error(err);
        return res.render('errors/500', { title: 'Error' });
    }
});

router.get('/dash/redirect', function(req, res) {
    res.redirect(`https://discord.com/oauth2/authorize?client_id=${settings.dashboard.clientid}&response_type=code&redirect_uri=${settings.dashboard.devmode ? 'http://localhost:8080' : settings.dashboard.fullredirecturl}/dash/login&scope=guilds+guilds.members.read+identify`);
});

router.get('/dash', async function(req, res) {
    const foundHost = tempStorage.find(i => i.hostname == req.ip);
    if (!foundHost) {
        return res.redirect('/dash/redirect');
    }

    const userResult = await request('https://discord.com/api/users/@me', {
        headers: {
            authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
        },
    });
    const guildResult = await request('https://discord.com/api/users/@me/guilds', {
        headers: {
            authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
        },
    });

    const userinfo = await userResult.body.json();
    const guildinfo = await guildResult.body.json();

    // console.log(guildinfo);
    const servers = guildinfo.map(g => ({
        id: g.id,
        icon: g.icon,
        title: g.name,
        permissions: g.permissions
    }));
    res.render('pages/dash', { title:"Dashboard", username: userinfo.username, usericon: `https://cdn.discordapp.com/avatars/${userinfo.id}/${userinfo.avatar}.png?size=128`, guilds: servers });
});

router.get('/dash/servers/:server', async function(req, res) {
    const foundHost = tempStorage.find(i => i.hostname == req.ip);
    if (!foundHost) {
        return res.redirect('/dash/redirect');
    }

    const guildResult = await request('https://discord.com/api/users/@me/guilds', {
        headers: {
            authorization: `${foundHost.tokenType} ${foundHost.accessToken}`,
        },
    });

    const guildinfo = await guildResult.body.json();
    const chosenguild = await guildinfo.find(g => g.id == req.params.server);
    if (chosenguild) {
        const permissions = require("discord-perms-array")(chosenguild.permissions);
        if (permissions.includes('ADMINISTRATOR')) {
            const db = await serverSettings.findById(chosenguild.id).cacheQuery();
            if (!db) return res.redirect(`https://discord.com/oauth2/authorize?client_id=${settings.dashboard.clientid}&permissions=52224&response_type=code&redirect_uri=${settings.dashboard.devmode ? 'http://localhost:8080' : settings.dashboard.fullredirecturl}/dash&scope=bot+applications.commands`);

            let invitebanner;
            if (require('../config.json').process.botclient) {
                const fetchedguild = await require('../bot').client.guilds.fetch(chosenguild.id);
                invitebanner = fetchedguild.splashURL({ size: 4096, extension: 'png' });

            }

            res.render('pages/serverconf', { title: 'Server config', config: db, server: chosenguild, background: invitebanner });
        }
        else {
            res.status(403);
            res.render('errors/403', { title: 'Forbidden' });
        }
    }
    else {
        res.status(404);
        res.render('errors/404', { title: 'Not found' });
    }
});

router.get('/dash/error', function(req, res) {
    res.render('errors/500', { title:"Error" });
});

module.exports = router;