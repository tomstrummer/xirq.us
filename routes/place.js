var _ = require('underscore')
  , helpers = require('./helpers')
  , Place = require('../models/Place')

exports.setup = function(app) {
	app.post('/place', function(req, res) {
		console.log( "Body:", typeof(req.body), req.body )
		var data = req.body
		var p = new Place({
			place_id : data.place_id,
			loc : data.loc,
			name : data.name
		})
		p.save(function(err) {
			if ( err ) {
				console.error("Save error:",err)
				return res.status(500).json({msg:"Error: " + err})
			}
			res.json({msg:"OK - saved"})
		})
	})

	app.get('/place', function(req,res) {
		console.log("params",req.query)
		var p = req.query
		if ( p.id ) { // find by id
			Place.findOne({place_id:p.id},function(err,place) {
				if ( err ) {
					console.warn("Find error", err)
					return res.status(404).json({msg:"not found"})
				}
				res.json(place)
			})
		}

		else if ( p.lat1 ) { // find all w/in bounding box
			Place.find({loc:{"$within": { 
					"$box" :[ [parseFloat(p.lat1), parseFloat(p.lng1)], 
				            [parseFloat(p.lat2), parseFloat(p.lng2)] ]
				}}}, 
				function(err,results) {
					if ( err ) {
						console.log("Find all error",err)	
						return res.status(500).json({msg:"error: " + err})				
					}
					res.json(results)
				})
		}
		else res.status(403).json({msg:"WTF"})
	})
}
