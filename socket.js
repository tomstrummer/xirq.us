var io = require('socket.io')
	, redis = require('redis')
	, User = require('./models/User')

module.exports.listen = function(server) {
	io_client = io.listen(server)
	
	io_client.sockets.on('connection', function (socket) {
		socket.emit('test', { hello: 'world' })
		socket.set('pubsub', new PubSub(socket))

		socket.on('sub', function (data) {
			console.log("Subscribe!", data)
			socket.get('pubsub',function(err,pubsub) {
				if (err) return console.warn("Error getting pubsub",err)
				pubsub.subscribe(data.place_id)
				pubsub.list(function(items) {
					console.log("pubsub sending list", items)
					socket.emit('post',items)
				})
			})
		})

		socket.on('unsub', function (data) {
			console.log("Unsubscribe",data)
			socket.get('pubsub',function(err,pubsub) {
				if (err) return console.warn("Error getting pubsub",err)
				console.log("Unsubscribing to",data.place_id)
				pubsub.unsubscribe(data.place_id)
			})
		})

		socket.on('post', function(data) {
			socket.get('pubsub',function(err,pubsub) {
				if (err) return console.warn("Error getting pubsub",err)

				data.ts = new Date()
				data.body = data.body.replace(
					new RegExp('http([^\\s]+)'),'<a href="http$1">http$1</a>')

				// TODO user info should be pulled from redis
				User.findByName( data.from, function(err,user) {
					if ( err ) return console.warn("User find error",err)
					data.from = user
					pubsub.publish(data)
				})
			})
		})

		socket.on('disconnect', function() {
			socket.get('pubsub',function(err,pubsub) {
				if (err) return console.warn("Error getting pubsub",err)
				console.log("client disconnecting")
				pubsub.quit()
			})
		})
	})
}

function PubSub(socket) {
	this.sub = redis.createClient()
	this.pub = redis.createClient()
	this.meta = redis.createClient()
	this.socket = socket
	self = this

	this.sub.on('subscribe',function(channel,count) {
		console.log("----------------- subscribed to", channel, count)
	})
	this.sub.on('message', function(channel, msg) {
		console.log("+++++++++++++++++ Broadcast post", channel, msg)
		try {
			self.socket.emit("post", [msg])
		} catch( e ) { console.error("=======================",e) }
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
	this.meta.lrange('list:'+this.feed_id,0,20,function(err,items) {
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
		return console.warn("-------- Not subscribed, dropping", data)
	data = JSON.stringify(data)
	this.pub.publish("ps:"+this.feed_id, data)
//	this.meta.incr('count:'+this.feed_id)
	this.meta.lpush('list:'+this.feed_id, data)
	console.log("Published to ", this.feed_id, data)
}

PubSub.prototype.quit = function() {
	if (this.sub !== null) this.sub.quit()
	if (this.pub !== null) this.pub.quit()
}
