var io = require('socket.io')
	, redis = require('redis')
	, md = require('discount')
	, config = require('./config')
	, User = require('./models/User')

module.exports.listen = function(server) {
	io_client = io.listen(server)
	
	io_client.sockets.on('connection', function (socket) {
		socket.emit('test', { hello: 'world' })
		socket.set('pubsub', new PubSub(socket))

		socket.on('sub', function (data) {
			console.log("Subscribe!", socket.id, data)
			socket.get('pubsub',function(err,pubsub) {
				if (err) return console.warn("Error getting pubsub",err)
				if ( pubsub == null ) { // reconnect
					pubsub = new PubSub(socket)
					socket.set('pubsub', pubsub)
				}
				pubsub.subscribe(data.place_id)
				pubsub.list(function(items) {
					socket.emit('post',items)
				})
			})
		})

		socket.on('unsub', function (data) {
			console.log("Unsubscribe",data)
			socket.get('pubsub',function(err,pubsub) {
				if (err) return console.warn("Error getting pubsub",err)
				console.log("Unsubscribing from",data.place_id)
				if ( pubsub == null ) return
				pubsub.unsubscribe(data.place_id)
			})
		})

		socket.on('post', function(data) {
			socket.get('pubsub',function(err,pubsub) {
				if (err) return console.warn("Error getting pubsub",err)
				if ( pubsub == null ) { // reconnect
					pubsub = new PubSub(socket)
					socket.set('pubsub', pubsub)
					pubsub.subscribe(data.place_id)
				}

				data.ts = new Date()
				data.body = md.parse(data.body,
					md.flags.noHTML | md.flags.safelink | md.flags.autolink)
				// data.body = data.body.replace( // auto-link (if we weren't using markdown
				// new RegExp('http([^\\s]+)'),'<a href="http$1">http$1</a>')

				// TODO user info should be pulled from redis
				User.findByName( data.from, function(err,user) {
					if ( err ) return console.warn("User find error",err)
					data.from = {
						userName: user.userName,
						email_hash: user.email_hash
					}
					pubsub.publish(data)
				})
			})
		})

		socket.on('disconnect', function() {
			socket.get('pubsub',function(err,pubsub) {
				if (err) return console.warn("Error getting pubsub",err)
				console.log("client disconnecting")
				if ( pubsub != null ) pubsub.quit()
			})
		})
	})
}

function PubSub(socket) {
	this.sub = redis.createClient(config.redis_opts.port, config.redis_opts.host)
	this.pub = redis.createClient(config.redis_opts.port, config.redis_opts.host)
	this.socket = socket

	this.sub.on('subscribe',function(channel,count) {
		console.log("----------------- subscribed to", channel, count)
	})

	this.sub.on('message', function(channel, msg) {
		// Note: calling 'this.socket' or aliasing the outer scope with 'self'
		// and calling 'self.socket' doesn't seem to work - all pubsubs seem 
		// to get associated to a single socket.
		console.log("+++++++++++++++++ Broadcast post", socket.id, channel, msg)
		try {
			socket.emit("post", [msg])
		} catch( e ) { console.error("============== Socket emit error",e) }
	})
}

PubSub.prototype.subscribe = function(feed_id) {
	// when someone else publishes to a channel we're subscribed to
	// should check that channel == ps:<this.feed_id>
	this.feed_id = feed_id
	this.sub.subscribe('ps:'+feed_id)
	console.log("Subscribing to feed", feed_id)
}

PubSub.prototype.list = function(cb) {
	if ( ! this.feed_id ) {
		console.warn("PubSub not yet subscribed to a feed!")
		return []
	}
	this.pub.lrange('list:'+this.feed_id,0,20,function(err,items) {
		if ( err ) return console.error("Error getting list items",this.feed_id, err)
		if ( ! cb ) return console.warn('pubsub list: invalid callback',cb)
		cb(items)
	})
}

PubSub.prototype.unsubscribe = function() {
	if ( ! this.feed_id ) return console.warn("Not subscribed")
	this.sub.unsubscribe('ps:'+this.feed_id)
	console.log("Unsubscribed from",this.feed_id)
}

PubSub.prototype.publish = function(data) {
	if ( ! this.feed_id ) 
		return console.warn("------------ Not subscribed, dropping", data)

	data = JSON.stringify(data)
	this.pub.multi()
		.publish("ps:"+this.feed_id, data)
//		.incr('count:'+this.feed_id)
		.lpush('list:'+this.feed_id, data)
		.exec(function(err,results) {
			if ( err ) return console.error("Redis pub error", err)
			console.log("Published to ", this.feed_id, results, data )
		})
}

PubSub.prototype.quit = function() {
	if (this.sub !== null) this.sub.quit()
	if (this.pub !== null) this.pub.quit()
}
