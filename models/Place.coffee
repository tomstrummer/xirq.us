mongoose = require("mongoose")
schema = mongoose.Schema(
  name: String
  place_id: String
  last_update: Date
  count: Number
  loc:
    type: Array
    index: "2d"
)
schema.index place_id: 1
schema.statics.findNear = (loc, callback) ->
  @find
    loc:
      $near: loc
      $maxDistance: 0.4
  , (err, results) ->
    callback err, results


Place = mongoose.model("Place", schema)
module.exports = Place
