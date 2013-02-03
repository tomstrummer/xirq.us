var auth = require('./auth')
  , index = require('./index')
  , place = require('./place')

module.exports.setup = function(app) {
	auth.setup(app)
	index.setup(app)
	place.setup(app)
}
