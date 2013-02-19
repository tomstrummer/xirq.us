io = require("socket.io")
redis = require("redis")
md = require("discount")
config = require("./config")
User = require("./models/User")

module.exports.listen = (server) ->
  io_client = io.listen(server)

  io_client.sockets.on "connection", (socket) ->
    
    socket.emit "test",
      hello: "world"

    socket.set "pubsub", new PubSub(socket)

    socket.on "sub", (data) ->
      console.log "Subscribe!", socket.id, data
      socket.get "pubsub", (err, pubsub) ->
        return console.warn("Error getting pubsub", err) if err
        unless pubsub?  # reconnect
          pubsub = new PubSub(socket)
          socket.set "pubsub", pubsub
        pubsub.subscribe data.place_id
        pubsub.fetch (items) ->
          socket.emit "post", items


    socket.on "unsub", (data) ->
      console.log "Unsubscribe", data
      socket.get "pubsub", (err, pubsub) ->
        return console.warn("Error getting pubsub", err) if err
        console.log "Unsubscribing from", data.place_id
        pubsub.unsubscribe data.place_id  if pubsub?


    socket.on "post", (data) ->
      socket.get "pubsub", (err, pubsub) ->
        return console.warn("Error getting pubsub", err) if err
        unless pubsub?  # reconnect
          pubsub = new PubSub(socket)
          socket.set "pubsub", pubsub
          pubsub.subscribe data.place_id
        data.ts = new Date()
        data.body = md.parse(data.body, md.flags.noHTML | md.flags.safelink | md.flags.autolink)
        User.findByName data.from, (err, user) ->
          return console.warn("User find error", err) if err
          data.from =
            userName: user.userName
            email_hash: user.email_hash

          pubsub.publish data


    socket.on "disconnect", ->
      socket.get "pubsub", (err, pubsub) ->
        return console.warn("Error getting pubsub", err) if err
        console.log "client disconnecting"
        pubsub.quit() if pubsub?


class PubSub
  
  constructor: (@socket) ->
    @sub = redis.createClient(config.redis_opts.port, config.redis_opts.host)
    @pub = redis.createClient(config.redis_opts.port, config.redis_opts.host)
    @sub.on "subscribe", (channel, count) ->
      console.log "----------------- subscribed to", channel, count

    @sub.on "message", (channel, msg) =>
      console.log "+++++++++++++++++ Broadcast post", @socket.id, channel, msg
      try
        @socket.emit "post", [msg]
      catch e
        console.error "============== Socket emit error", e


  subscribe: (feed_id) ->
    # when someone else publishes to a channel we're subscribed to
    # should check that channel == ps:<this.feed_id>
    @feed_id = feed_id
    @sub.subscribe "ps:" + feed_id
    console.log "Subscribing to feed", feed_id


  fetch: (cb) ->
    unless @feed_id
      console.warn "PubSub not yet subscribed to a feed!"
      return []
    @pub.lrange "list:" + @feed_id, 0, 20, (err, items) ->
      return console.error("Error getting list items", @feed_id, err) if err
      return console.warn("pubsub fetch: invalid callback", cb) unless cb
      cb items

  unsubscribe: ->
    return console.warn("Not subscribed")  unless @feed_id
    @sub.unsubscribe "ps:" + @feed_id
    console.log "Unsubscribed from", @feed_id

  publish: (data) ->
    return console.warn("------------ Not subscribed, dropping", data) unless @feed_id
    data = JSON.stringify(data)
    @pub.multi().publish("ps:" + @feed_id, data)
      .lpush("list:" + @feed_id, data)
      .exec (err, results) ->
        return console.error("Redis pub error", err)  if err
        console.log "Published to ", @feed_id, results, data

  quit: ->
    @sub.quit() if @sub?
    @pub.quit() if @pub?
