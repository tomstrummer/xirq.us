var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , socket = require('./socket').listen(server)
  , path = require('path')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , RedisStore = require('connect-redis')(express)
  , UglifyMiddleware = require('uglify-js-middleware')
  , sass = require('node-sass')
  , redis = require('redis')
  , mongoose = require("mongoose")
  , User = require('./models/User')
  , config = require('./config')
  , routes = require('./routes/init')
  
var db = mongoose.connection
db.on('error', console.error.bind(console, 'Mongo connection error:'))
db.once('open', function callback () {
	console.log("Mongo DB connected!")
})
db = mongoose.connect(config.mongo_url)

redisClient = redis.createClient(config.redis_opts.port, config.redis_opts.host)
redisClient.on("error", function (err) {
  console.error("REDIS Error ", err)
})

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views')
  app.set('view engine', 'jade')
  app.use(express.logger())
  app.use(express.cookieParser())
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(UglifyMiddleware({
  	src : __dirname + '/public',
	  uglyext: 1,
		debug: true
	}))
	app.use(sass.middleware({
		src: __dirname + '/public',
		output_style : 'compressed',
    debug: true
  }))
  app.use(passport.initialize())
  // Redis will store sessions
  app.use(express.session( { store: new RedisStore(config.redis_opts), 
  	secret: 'keyboard catfish', 
  	cookie: { secure: false, maxAge:86400000 } } ))
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(app.router)
  app.use(express.static(path.join(__dirname, 'public')))
})

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
})

// Passport session setup.
passport.serializeUser(function(user, done) {
  console.info("passport.serializeUser")
  console.info(user)
  done(null, user.userName)
})

passport.deserializeUser(function(username, done) {
  // Use User model to retrive the user from the database
  User.findByName(username, function (err, user) {
    console.info("passport.deserializeUser")
    console.info(user)
    done(err, user)
  })
})

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  
passport.use(new LocalStrategy( { usernameField: 'username', passwordField: 'password' },
  function(username, password, done) {
    process.nextTick(function() {
      User.authenticate(username, password, function (error, user) {
        console.info("locastrategy:",error,user)
        if ( error == "ERR_NOT_FOUND") return done(error,user,"Not found")
        if ( error == "ERR_INVALID_PASS") return done(error,user,"Invalid password")
        return done(error,user)
      })
    })
}))

// create all routes here:
routes.setup(app)

function quit(sig) {
	if (typeof sig === "string") {
		console.log('%s: Received %s - terminating Node server ...', Date(Date.now()), sig)
		process.exit(1)
	}
	console.log('%s: Node server stopped.', Date(Date.now()) )
}

// Process on exit and signals.
process.on('exit', function() { quit() });

'SIGHUP,SIGINT,SIGQUIT,SIGILL,SIGTRAP,SIGABRT,SIGBUS,SIGFPE,SIGSEGV,SIGTERM'.split(',').forEach(function(sig,i) {
    process.on(sig, function() { quit(sig) })
})

/* Run server  */
server.listen(config.listen_port, config.listen_ip, function() {
	console.log('%s: Node (version: %s) %s started on %s:%d ...', Date(Date.now()), 
		process.version, process.argv[1], config.listen_ip, config.listen_port )
})
