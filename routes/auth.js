var User = require("../models/User")
  , passport = require('passport')


module.exports.setup = function(app) {

	app.get('/login', function(req, res) {
		res.render('login')
	})

	app.post('/login', function(req, res, next) {
		passport.authenticate('local', function(err, user, info) {
			if ( err ) { return next(err) }
			if ( ! user ) 
				return res.render('login', { "user": req.user, "message": info })

			req.logIn(user, function(err) {
				if (err) { return next(err) }
				return res.redirect("/")
			})
		})(req, res, next)
	})

	app.get('/logout', function(req, res){
		req.logout()
		res.redirect("/login")
	})

	app.post('/register', function(req, res) {
		console.info("====CREATE ACCOUNT====")
		console.info(req.body)
		
		var uid = req.body.username
		User.findByName({userName:uid}, function(err, data) {
			console.log("Callback!!!!---------")
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
	})

	app.get('/register', function(req, res){
		return res.render('register')
	})
}


