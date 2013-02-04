var env = process.env
  , keys = require('./keys')
  , format = require('util').format

module.exports = {
	mongo_url : env.OPENSHIFT_MONGODB_DB_HOST ? 
		format( "mongodb://xirqus:xirqus@%s:%d/xirqus?poolSize=5", 
			env.OPENSHIFT_MONGODB_DB_HOST,
			parseInt(env.OPENSHIFT_MONGODB_DB_PORT) ) : 
		'mongodb://localhost:27017/xirqus?poolSize=5',
	redis_opts : {
		host : process.env.REDIS_IP || 'localhost',
		port : process.env.REDIS_PORT || 6379,
		db : 'xirqus_session',
	},
	layout_vars : {
		maps_api_key : keys.maps_api_key,
	},
	debug : ! env.OPENSHIFT_GEAR_DNS,
	listen_port : parseInt(process.env.OPENSHIFT_INTERNAL_PORT) || 8888,
	listen_ip : process.env.OPENSHIFT_INTERNAL_IP || "127.0.0.1",
}
