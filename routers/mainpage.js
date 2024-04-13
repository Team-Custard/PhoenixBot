const express = require('express');

const router = express.Router();

router.get('/', function(req, res) {
    res.render('pages/home', { title:"Home" });
});
router.get('/server', function(req, res) {
    res.redirect('https://discord.gg/JC3WAcxFq6');
});
router.get('/commands', function(req, res) {
    res.render('pages/commands', { title:"Commands" });
});
router.get('/sexy', function(req, res) {
    res.status(403);
    if (req.accepts('html')) {
        res.render('errors/403', { title:"Forbidden", url: req.url });
        return;
    }
    if (req.accepts('json')) {
        res.json({ error: 'Forbidden' });
        return;
    }
    res.type('txt').send('Forbidden');
});

module.exports = router;