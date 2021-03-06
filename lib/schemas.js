//    Aebleskiver
//    (c) 2011 Beau Sorensen
//    Aebleskiver may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/aebleskiver

// Mongoose ORM Schemas
// --------------------

// Exports for CommonJS
var Schemas;
if (typeof exports !== 'undefined') {
    bcrypt   = require('bcrypt');
    Mongoose = require('mongoose');
    Schema   = Mongoose.Schema;
    ObjectId = Schema.ObjectId;
    Schemas  = module.exports = {};
}

//###extractKeywords
// Keyword extractor for mongo searchability
function extractKeywords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(function(v) { return v.length > 2; })
    .filter(function(v, i, a) { return a.lastIndexOf(v) === i; });
}

//###validatePresenceOf
// Simple required field validator
function validatePresenceOf(value) {
    return value && value.length;
}

//###encryptPassword
// Asynchronous bcrypt password protection
function encryptPassword(password) {
    return bcrypt.encrypt_sync(password, bcrypt.gen_salt_sync(10));
}

//##Schemas
// Basic schema definitions initialized here, schema 
// methods and custom getters/setters that interact with 
// other schemas / models will need them to be defined first
Schemas = {
    //###Message
    // Basic chat message
    Message : new Schema({
        room     : { type : String, index : true },
        text     : String,
        username : String,
        to       : ObjectId,
        user_id  : String,
        avatar   : String,
        created  : { type : Date, default : Date.now },
        modified : { type : Date, default : Date.now }
    }),

    //###Room
    // Chat room schema
    Room : new Schema({
        name        : { type : String, index : { unique : true } },
        slug        : { type : String, index : { unique : true } },
        user_id     : ObjectId,
        tags        : Array,
        keywords    : [String],
        description : String,
        rank        : Number,
        restricted  : String,
        allowed     : Array,
        banned      : Array,
        upvotes     : { type : Number, default : 0 },
        downvotes   : { type : Number, default : 0 },
        created     : { type : Date, default : Date.now },
        modified    : { type : Date, default : Date.now }
    }),

    //###Conversation
    // Chat room schema
    Conversation : new Schema({
        user_id     : ObjectId,
        users       : Array,
        created     : { type : Date, default : Date.now },
        modified    : { type : Date, default : Date.now }
    }),

    //###User
    // User
    User : new Schema({
        username         : { type : String, index : { unique : true } },
        email            : { type : String, index : { unique : true } },
        status           : { type : String, index : true },
        visits           : Number,
        displayName      : String,
        bio              : String,
        avatar           : String,
        crypted_password : String,
        profile_image    : String,
        images           : Array,
        friends          : Array,
        blocked          : Array,
        restricted       : String,
        favorites        : Array,
        created          : { type : Date, default : Date.now },
        modified         : { type : Date, default : Date.now }
    }),
    
    //###Application
    // Application schema, not currently used, but can be set 
    // in the future for DB configurables / simple analytics, 
    // there should probably never be more than one
    Application : new Schema({
        server  : { type : String, index : { unique : true } },
        visits  : Number
    }),
    
    //###Session
    // Session defined to match connect-mongodb package sessions, 
    // to allow tighter integration between Express / Mongoose, 
    // which will ultimately trickle down to Backbone ease-of-use
    Session : new Schema({
        _id     : String,
        session : { type : String, get : function() {
            return JSON.parse(this.session);
        }},
        expires : Number
    }),
    
    //###Token
    // Login tokens for session persistance
    Token : new Schema({
        email  : { type: String, index: true },
        series : { type: String, index: true },
        token  : { type: String, index: true }
    })
};

Schemas.User
    .virtual('password')
    .set(function(password) {
        this._password = password;
        this.set('crypted_password', encryptPassword(password));
        
    })
    .get(function() { 
        return this._password; 
    });

Schemas.User
    .method('authenticate', function(password) {
    
        //Sync
        return bcrypt.compare_sync(password, this.crypted_password); // false
        return;
    
        // Async
        bcrypt.compare(password, this.crypted_password, function(err, result) {
            return result;
        });
    });

Schemas.User
    .pre('save', function(next) {
        if (!validatePresenceOf(this.password)) {
            next(new Error('Invalid password'));
        } 
        else {
            this.set('modified', new Date());
            next();
        }
    });

Schemas.Room
    .pre('save', function(next) {
        this.set('modified', new Date());
        var keywords = extractKeywords(this.name);
        var descwords = extractKeywords(this.description);
        
        var concat = keywords.concat(descwords);
        this.keywords = _.unique(concat);
        next();
    });
    
Schemas.Room
    .path('name')
    .set(function(v){
        this.slug = v
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/-+/g, '');
            
        return v;
    });
    
    

Schemas.Token
    .method('randomToken', function() {
        return Math.round((new Date().valueOf() * Math.random())) + '';
    });

Schemas.Token
    .pre('save', function(next) {
        // Automatically create the tokens
        this.token = this.randomToken();

        if (this.isNew)
        this.series = this.randomToken();

        next();
    });

Schemas.Token
    .virtual('id')
    .get(function() {
        return this._id.toHexString();
    });

Schemas.Token
    .virtual('cookieValue')
    .get(function() {
        return JSON.stringify({ 
            email  : this.email, 
            token  : this.token, 
            series : this.series 
        });
    });

// Set models to mongoose
Mongoose.model('user',         Schemas.User);
Mongoose.model('room',         Schemas.Room);
Mongoose.model('token',        Schemas.Token);
Mongoose.model('message',      Schemas.Message);
Mongoose.model('session',      Schemas.Session);
Mongoose.model('application',  Schemas.Application);
Mongoose.model('conversation', Schemas.Conversation);

