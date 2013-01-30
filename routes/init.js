var authRoutes = require('./auth')
  , indexRoutes = require('./index')

module.exports.setup = function(app) {
	authRoutes.setup(app)
	indexRoutes.setup(app)
}
