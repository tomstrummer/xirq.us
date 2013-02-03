var mongoose = require("mongoose")

var schema = mongoose.Schema({
		name: String,
		place_id: String,
		last_update : Date,
		count : Number,
		loc : { type : Array, index : '2d'}
	})
schema.index({place_id:1})

schema.statics.findNear = function(loc, callback) {
	this.find({loc: {'$near':loc,'$maxDistance':0.4}},function(err,results) {
		callback(err,results)
	})
}

var Place = mongoose.model('Place', schema)

module.exports = Place
