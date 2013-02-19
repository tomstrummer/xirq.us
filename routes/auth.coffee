User = require("../models/User")
passport = require("passport")
module.exports.setup = (app) ->
  app.get "/login", (req, res) ->
    res.render "login"

  app.post "/login", (req, res, next) ->
    passport.authenticate("local", (err, user, info) ->
      return next(err)  if err
      unless user
        return res.render("login",
          user: req.user
          message: info
        )
      req.logIn user, (err) ->
        return next(err)  if err
        res.redirect "/"

    ) req, res, next

  app.get "/logout", (req, res) ->
    req.logout()
    res.redirect "/login"

  app.post "/register", (req, res) ->
    console.info "====CREATE ACCOUNT===="
    console.info req.body
    uid = req.body.username
    User.findByName
      userName: uid
    , (err, data) ->
      console.log "Callback!!!!---------"
      if data
        console.log "User already exists!", uid
        return res.render("register",
          message: "The email is already used"
        )
      user = new User(
        userName: uid
        password: req.body.password
        email: req.body.email
      )
      console.info "Creating user:", user
      user.save (err) ->
        if err
          console.error err
          if err is "ERR_DB"
            res.send 500
          else if err is "ERR_USER_EXISTS"
            res.redirect "/",
              message: "The email is already used"

        else
          req.logIn user, (err) ->
            if err
              console.error err
              res.send 500
            else
              res.redirect "/"




  app.get "/register", (req, res) ->
    res.render "register"

