express = require("express")
app = express()
server = require("http").createServer(app)
path = require("path")
passport = require("passport")
LocalStrategy = require("passport-local").Strategy
RedisStore = require("connect-redis")(express)
assets = require('connect-assets')
mongoose = require("mongoose")

User = require("./models/User")
config = require("./config")
routes = require("./routes/init")
keys = require('./keys')

sessionStore = new RedisStore(config.redis_opts)
socket = require("./socket").listen(server, sessionStore)

db = mongoose.connection
db.on "error", console.error.bind(console, "Mongo connection error:")
db.once "open", callback = ->
  console.log "Mongo DB connected!"
mongoose.connect(config.mongo_url)

#redisClient = redis.createClient(config.redis_opts.port, config.redis_opts.host)
#redisClient.on "error", (err) ->
#  console.error "REDIS Error ", err

app.configure ->
  app.set "views", path.join(__dirname, "views")
  app.set "view engine", "jade"
  app.use express.logger()
  app.use express.cookieParser()
  app.use express.bodyParser()
  app.use express.methodOverride()

  app.use express.session(
    store:  sessionStore
    secret: keys.session_secret
    cookie:
      secure: false
      maxAge: 86400000
  )
  app.use passport.initialize()
  app.use passport.session()
  app.use assets()

  app.use app.router
  app.use express.static(path.join(__dirname, "public"))

app.configure "development", ->
  app.use express.errorHandler(
    dumpExceptions: true
    showStack: true
  )

passport.serializeUser (user, done) ->
  console.info "passport.serializeUser"
  console.info user
  done null, user.userName

passport.deserializeUser (username, done) ->
  User.findByName username, (err, user) ->
    console.info "passport.deserializeUser"
    console.info user
    done err, user

passport.use new LocalStrategy(
  usernameField: "username"
  passwordField: "password"
, (username, password, done) ->
  process.nextTick ->
    User.authenticate username, password, (error, user) ->
      console.info "locastrategy:", error, user
      return done(error, user, "Not found")  if error is "ERR_NOT_FOUND"
      return done(error, user, "Invalid password")  if error is "ERR_INVALID_PASS"
      done error, user
)

routes.setup app

quit = (sig) ->
  if typeof sig is "string"
    console.log "%s: Received %s - terminating Node server ...", Date(Date.now()), sig
    process.exit 1
  console.log "%s: Node server stopped.", Date(Date.now())

# Process on exit and signals.
process.on "exit", ->
  quit()

"HUP,INT,QUIT,TERM".split(",").forEach (sig, i) ->
  process.on "SIG#{sig}", ->
    quit "SIG#{sig}"

# Run server  
server.listen config.listen_port, config.listen_ip, ->
  console.log "%s: Node (version: %s) %s started on %s:%d ...", Date(Date.now()), process.version, process.argv[1], config.listen_ip, config.listen_port

