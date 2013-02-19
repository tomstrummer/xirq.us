auth = require("./auth")
index = require("./index")
place = require("./place")
module.exports.setup = (app) ->
  auth.setup app
  index.setup app
  place.setup app
