mongoose = require("mongoose")
crypto = require("crypto")
schema = mongoose.Schema(
  userName: String
  password: String
  email: String
  email_hash: String # md5 for gravatar
  fullName: String
)
schema.pre "save", (next) ->
  console.log "mongoose pre-save:", this
  @_id = @userName  unless @_id
  shasum = crypto.createHash("sha1")
  shasum.update @password
  @password = shasum.digest("hex")
  md5 = crypto.createHash("md5")
  md5.update @password
  @email_hash = md5.digest("hex")
  next()

User = mongoose.model("User", schema)
User.findByName = (userName, cb) ->
  User.findOne
    userName: userName
  , cb

User.authenticate = (userName, password, cb) ->
  User.findOne
    userName: userName
  , (err, user) ->
    if err
      console.log "Find error", userName
      return cb("ERR_DB", false)
    unless user?
      console.log "Not found:", userName
      return cb("ERR_NOT_FOUND", user)
    shasum = crypto.createHash("sha1")
    shasum.update password
    input_pass = shasum.digest("hex")
    return cb(null, user)  if user.password is input_pass
    cb "ERR_INVALID_PASS", false


module.exports = User
