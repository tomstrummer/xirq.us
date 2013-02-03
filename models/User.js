var mongoose = require("mongoose")
  , crypto = require('crypto')


var schema = mongoose.Schema({
		userName: String,
		password: String,
		email: String,
		email_hash: String, // md5 for gravatar
		fullName: String
	})


schema.pre('save', function(next) {
	console.log('mongoose pre-save:',this)
	if ( ! this._id )
	this._id = this.userName

	var shasum = crypto.createHash('sha1')
	shasum.update(this.password)
	this.password = shasum.digest('hex')

	var md5 = crypto.createHash('md5')
	md5.update(this.password)
	this.email_hash = md5.digest('hex')

	next()
})

var User = mongoose.model('User', schema)

User.findByName = function(userName, cb) {
	User.findOne({userName:userName}, cb)
}

User.authenticate = function(userName, password, cb) {
	User.findOne({userName:userName}, function(err,user) {
		if (err) {
			console.log("Find error", userName)
			return cb("ERR_DB", false)
		}
		if (user == null ) {
			console.log("Not found:", userName)
			return cb("ERR_NOT_FOUND",user)
		}

		var shasum = crypto.createHash('sha1');
		shasum.update(password);
		input_pass = shasum.digest('hex');
	
		if ( user.password == input_pass ) 
			return cb(null, user)

		return cb("ERR_INVALID_PASS", false)
	})
}

module.exports = User;
