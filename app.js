var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , path = require('path')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , RedisStore = require('connect-redis')(express)
  , redis = require('redis')
  , mongoose = require("mongoose")
  , User = require('./models/User')
  , routes = require('./routes')
  , index = require('./routes/index')
  , users = require('./routes/users')
  , config = require('./config')
  
var db = mongoose.connection
db.on('error', console.error.bind(console, 'Mongo connection error:'))
db.once('open', function callback () {
	console.log("Mongo DB connected!")
});
db = mongoose.connect(config.mongo_url)

redisClient = redis.createClient(config.redis_opts.port, config.redis_opts.host);
redisClient.on("error", function (err) {
  console.error("REDIS Error ", err);
});

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(passport.initialize());
  // Redis will store sessions
  app.use(express.session( { store: new RedisStore(config.redis_opts), 
  	secret: 'keyboard catfish', 
  	cookie: { secure: false, maxAge:86400000 } } ));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});


// Passport session setup.
passport.serializeUser(function(user, done) {
  console.info("passport.serializeUser");
  console.info(user);
  done(null, user.userName);
});

passport.deserializeUser(function(username, done) {
  // Use User model to retrive the user from the database
  User.findByName(username, function (err, user) {
    console.info("passport.deserializeUser");
    console.info(user);
    done(err, user);
  });
});

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
  

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next() }
  res.redirect('/login');
}

app.get('/', ensureAuthenticated, function(req, res) {
  res.render('index', { user: req.user })
});


app.get('/login', function(req, res) {
  res.render('login')
});

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if ( err ) { return next(err) }
    if ( ! user ) 
      return res.render('login', { "user": req.user, "message": info })

    req.logIn(user, function(err) {
      if (err) { return next(err) }
      return res.redirect("/")
    });
  })(req, res, next)
});

app.get('/logout', function(req, res){
  req.logout()
  res.redirect("/login")
});

app.get('/test',function(req,res) {
  console.log("TEST",req.query)
  User.find({userName:req.query.user},function(e,u) {
  	console.log("USER",e,u)
  	res.write("hi")
  	res.done()
	})
})

app.post('/register', users.createAccount)
app.get('/register', function(req, res){
  return res.render('register')
})


function quit(sig) {
	if (typeof sig === "string") {
		console.log('%s: Received %s - terminating Node server ...', Date(Date.now()), sig)
		process.exit(1)
	}
	console.log('%s: Node server stopped.', Date(Date.now()) )
}

// Process on exit and signals.
process.on('exit', function() { quit() });

'SIGHUP,SIGINT,SIGQUIT,SIGILL,SIGTRAP,SIGABRT,SIGBUS,SIGFPE,SIGSEGV,SIGTERM'.split(',').forEach(function(sig, index, array) {
    process.on(sig, function() { quit(sig) })
})

/* Run server  */
server.listen(config.listen_port, config.listen_ip, function() {
	console.log('%s: Node (version: %s) %s started on %s:%d ...', Date(Date.now()), 
		process.version, process.argv[1], config.listen_ip, config.listen_port )
});
