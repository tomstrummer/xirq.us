var _ = require('underscore')
  , helpers = require('./helpers')
  , keys = require('../keys')

exports.setup = function(app) {
	app.get('/', helpers.ensureAuthenticated, function(req, res) {
		var vals = {
			username : req.user.userName,
			email_hash : req.user.email_hash
		}
		_.extend(vals,keys)
		res.render( 'index', vals )
	})
}
