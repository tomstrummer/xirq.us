var io = require('socket.io')

module.exports.listen = function(server) {
	io_client = io.listen(server)
	
	io_client.sockets.on('connection', function (socket) {
		socket.emit('news', { hello: 'world' })
		socket.on('my other event', function (data) {
			console.log(data)
		})
	})
}
