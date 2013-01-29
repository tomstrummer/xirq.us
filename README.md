Xirq.us
=============================

Node app that aims to be sort of a location-centric Twitter.

Some code borrowed from:
https://github.com/hardlifeofapo/node-passport-couchbase-redis
https://github.com/eddie168/openshift-diy-nodejs-redis 

Usage:

    npm install
    node app.js 
	

To use in OpenShift:

    rhc domain create -n mydomain
    rhc app create -t diy-0.1 -a myapp
    rhc app cartridge add -a myapp -c mongodb-2.2
    git push

Then go to http://myapp-mydomain.rhcloud.com
    
Change values in `.openshift/action_hooks/pre_build` to change node or redis versions.  
See [openshift-diy-nodejs-redis](https://github.com/eddie168/openshift-diy-nodejs-redis) 
for more details.


