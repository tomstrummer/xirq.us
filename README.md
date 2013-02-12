# Xirq.us

Node app that aims to be sort of a location-centric Twitter.  Instead of feeds sorted by 
hashtags or lists of followers, feeds are grouped by location or event.  This allows you to
see *where* things are happening, as they happen.

The live app is running at http://xirq.us

Features:
* Real-time push updates when viewing a feed (using Redis and Socket.io)
* Markdown support
* [oEmbed](http://oembed.com/) support for inline link previews
* Google Maps integration
* Deploys to RedHat OpenShift

Some boilerplate code was borrowed from:
* [node-passport-couchbase-redis](https://github.com/hardlifeofapo/node-passport-couchbase-redis)
* [openshift-diy-nodejs-redis](https://github.com/eddie168/openshift-diy-nodejs-redis)
* [nodejs-pub-sub-chat-demo](https://github.com/steffenwt/nodejs-pub-sub-chat-demo)

This app was originally created during the [Downcity JS](http://downcityjs.com/) hackathon in Providence, and took home the "Best Solo" prize!


## Development

If you want to improve/ modify/ deploy your own, here's how to start:

Copy `sample_keys.js` to `keys.js` and put in your proper values; also, edit any additional
parameters in `config.js`.

For local development, you'll need [Node.js](http://nodejs.org), [MongoDB](http://mongodb.org) 
and [Redis](http://redis.io/) installed.

    # on mac: 
    brew install node
    brew install mongodb
    brew install redis

    # install node dependencies
    npm install
    npm install nodemon -g
    nodemon app.js 


## Deployment

This app is meant to be deployed on Red Hat [OpenShift](http://openshift.redhat.com/) 
PaaS, although it will work in any environment (e.g. nodejitsu or Heroku) where you have 
node, Mongo, Redis and socket.io support.  

To deploy on OpenShift (replace values for `mydomain` and `myapp` below):

    # create a new app
    rhc domain create -n mydomain
    rhc app create -t diy-0.1 -a myapp
    rhc app cartridge add -a myapp -c mongodb-2.2

    # pull this source into your app
    git remote add xirqus -m master git://github.com/tomstrummer/xirq.us.git
    git pull -s recursive -X theirs xirqus master
    git push
    
Change values in `.openshift/action_hooks/pre_build` to change node or redis versions.  
See [openshift-diy-nodejs-redis](https://github.com/eddie168/openshift-diy-nodejs-redis) 
for more details.

Note that you need to either checkin a version of `keys.js`  or copy it to your RHC instance
like so:

    scp keys.js abc1234@myapp-mydomain.rhcloud.com:app-root/data/
    
then the [post-build](.openshift/action_hooks/post-build) hook will symlink `keys.js` 
to the project dir `~/app-root/repo` when you do a `git push` to rhc.

Finally, your app should be running at `http://myapp-mydomain.rhcloud.com`


## TODO

* Heat maps - instead of Google Maps markers, use circles with size/ color/ 
  saturation/ transparency to represent different levels of activity
* TTL on posts
* Auto-generate demo data for live site
* Location permalinks
 * Consider swapping Google Maps for Leaflet/ OSM
* Use foursquare instead of Google Places (it sucks for venues that are not 
  restaurants/ entertainment)
* Authenticate the uid sent in posts (e.g. integrate socket.io w/ passport)
* Twitter features - @user messaging, #hashtags, etc.
