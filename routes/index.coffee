_ = require("underscore")
helpers = require("./helpers")
keys = require("../keys")
exports.setup = (app) ->
  app.get "/", helpers.ensureAuthenticated, (req, res) ->
    vals =
      username: req.user.userName
      email_hash: req.user.email_hash

    _.extend vals, keys
    res.render "index", vals

