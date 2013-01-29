module.exports = {
	mongo_url : 'mongodb://localhost:27017/xirqus?poolSize=5',
	redis_opts : {
		host : process.env.REDIS_IP || 'localhost',
		port : process.env.REDIS_PORT || 6379,
		db : 'xirqus_session',
	},
  debug : false,
  listen_port : parseInt(process.env.OPENSHIFT_INTERNAL_PORT) || 8888,
  listen_ip : process.env.OPENSHIFT_INTERNAL_IP || "127.0.0.1",
};

var env = process.env
if ( env.OPENSHIFT_NOSQL_DB_HOST ) {
	var format = require('util').format;

	exports.config.mongo_url = format(
			"mongodb://%s:%s@%s:%d/xirqus?poolSize=5", 
			env.OPENSHIFT_NOSQL_DB_USERNAME,
			env.OPENSHIFT_NOSQL_DB_PASSWORD,
			env.OPENSHIFT_NOSQL_DB_HOST,
			parseInt(env.OPENSHIFT_NOSQL_DB_PORT) )

}
