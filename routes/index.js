var _ = require('underscore')
  , helpers = require('./helpers')
  , keys = require('../keys')

exports.setup = function(app) {
	app.get('/', function(req, res) {
		var vals = {}
		_.extend(vals,keys)
		res.render( 'index', vals )
	})
}
