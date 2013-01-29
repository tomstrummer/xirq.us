var User = require("../models/User")

/*
 * GET users listing.
 */

exports.list = function(req, res) {
  res.send("respond with a resource")
}

exports.login = function(req, res) {
  console.info("login")
  res.render('login', { title: 'Express' })
}


exports.createAccount = function(req, res) {
  console.info("====CREATE ACCOUNT====")
  console.info(req.body)
  
  var uid = req.body.username
  User.findByName({userName:uid}, function(err, data) {
    if ( data ) {
			console.log("User already exists!",uid)
    	return res.render("register", { message: 'The email is already used' })
		}

		var user = new User({
			userName : uid,
			password : req.body.password,
			email : req.body.email })
		
		console.info("Creating user:",user);
		
		user.save( function(err) {
			if ( err ) {
				console.error(err);
				if(err == "ERR_DB") return res.send(500)
				
				else if(err == "ERR_USER_EXISTS")
					return res.redirect("/", { message: 'The email is already used' })
			}
			else {
				req.logIn(user, function(err) {
					if ( err ) {
						console.error(err)
						return res.send(500)
					} 
					else return res.redirect("/")
				})
			}
		})
  })
}
