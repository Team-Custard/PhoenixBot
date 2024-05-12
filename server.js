const settings = require("./config.json");

const express = require('express');
const app = express();

require('dotenv').config();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/static'));
if (settings.dashboard.devmode == "on") {app.enable('trust proxy');}

app.use(require('./routers/mainpage'));
app.use(require('./routers/api'));
// app.use(require('./routers/interactions'));
// app.use(require('./routers/dashboard'));

app.use(function(req, res, next) {
    if (settings.dashboard.devmode == 'off' && !req.secure) {
        return res.redirect("https://" + req.headers.host + res.url);
    }

    next();
});

app.use(function(req, res) {
    res.status(404);
    if (req.accepts('html')) {
        res.render('errors/404', { title:"Not found", url: req.url });
        return;
    }
    if (req.accepts('json')) {
        res.json({ error: 'Not found' });
        return;
    }
    res.type('txt').send('Not found');
});

app.listen(settings.dashboard.serverport);

console.log("Dashboard is ready. Listening at localhost:%d", settings.dashboard.serverport);