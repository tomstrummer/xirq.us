_ = require("underscore")
helpers = require("./helpers")
Place = require("../models/Place")
exports.setup = (app) ->
  app.post "/place", (req, res) ->
    console.log "Body:", typeof (req.body), req.body
    data = req.body
    p = new Place(
      place_id: data.place_id
      loc: data.loc
      name: data.name
    )
    p.save (err) ->
      if err
        console.error "Save error:", err
        return res.status(500).json(msg: "Error: " + err)
      res.json msg: "OK - saved", places: [p]


  app.get "/place", (req, res) ->
    console.log "params", req.query
    p = req.query
    if p.id # find by id
      Place.findOne
        place_id: p.id
      , (err, place) ->
        if err
          console.warn "Find error", err
          return res.status(404).json(msg: "not found")
        res.json place

    else if p.lat1 # find all w/in bounding box
      Place.find
        loc:
          $within:
            $box: [[parseFloat(p.lat1), parseFloat(p.lng1)],
                   [parseFloat(p.lat2), parseFloat(p.lng2)]]
      , (err, results) ->
        if err
          console.log "Find all error", err
          return res.status(500).json(msg: "error: " + err)
        res.json msg: "OK", places: results

    else
      res.status(403).json msg: "WTF"

