module.exports = {
	mongo_url : 'mongodb://localhost:27017/xirqus?poolSize=5',
	redis_opts : {
		host : 'localhost',
		db : 'xirqus_session',
	},
  debug : false,
  listen_port : parseInt(process.env.OPENSHIFT_INTERNAL_PORT) || 8888,
  internal_ip : process.env.OPENSHIFT_INTERNAL_IP || "127.0.0.1",
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
