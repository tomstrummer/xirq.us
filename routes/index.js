var helpers = require('./helpers')

exports.setup = function(app){
	app.get('/', helpers.ensureAuthenticated, function(req, res) {
		res.render('index', { user: req.user })
	})
};


