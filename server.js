(function(){
    // Application Server
    // ------------------
    require.paths.unshift(__dirname + '/lib');
    
    // Dependancies
    var express     = require('express'),
        PubSub      = require('protocol-pubsub'),
        Synchronize = require('protocol-backbone'),
        Gravatar    = require('protocol-gravatar'),
        Auth        = require('protocol-auth'),
        dnode       = require('dnode'),
        version     = '0.0.9',
        port        = 3000
        server      = module.exports = express.createServer();
    
    // Server configuration
    server.configure(function() {
        server.use(express.bodyParser());
        server.use(express.methodOverride());
        server.use(express.static(__dirname + '/public'));
        server.set('view options', {layout : false});
    });=
    
    // Main application
    server.get('/', function(req, res) {
    
        res.render('index.jade', {
            locals : {
                port    : port,
                version : (version || '0.0.0'),
                token   : (token   || ''),
            }
        });
    });
    
    // Start application
    server.listen(port);
    dnode()
        .use(Auth)          // Authentication support
        .use(PubSub)        // Pub/sub channel support
        .use(Synchronize)   // Backbone integration
        .use(Gravatar)      // Gravatar integration
        .listen(server)     // Start your engines
})()