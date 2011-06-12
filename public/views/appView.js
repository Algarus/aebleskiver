﻿(function(ß) {
    // Application view
    // -----------------
    
    // Application
    ß.Views.ApplicationView = Backbone.View.extend({
    
        // DOM attributes
        template             : _.template($('#application-template').html()),
        statsTemplate        : _.template($('#application-stats-template').html()),
        loginTemplate        : _.template($('#login-template').html()),
        signupTemplate       : _.template($('#signup-template').html()),
        settingsTemplate     : _.template($('#settings-template').html()),
        createRoomTemplate   : _.template($('#create-room-template').html()),
        notificationTemplate : _.template($('#notification-template').html()),
        
        // Interaction events
        events    : {
            'keyup'              : 'hideOnEscape',
            'click #show-rooms'  : 'showRooms',
            'click #show-users'  : 'showUsers',
            'click .cancel'      : 'hideDialogs',
            'click #overlay'     : 'hideDialogs',
            'click #logout'      : 'logout',
            
            // Create new room form
            'click #create-room'               : 'showCreateRoom',
            'click #create-room-form .submit'  : 'createRoom',
            'keypress #create-room-form input' : 'createRoomOnEnter',
            
            // Login form
            'click #login'               : 'showLogin',
            'click #login-form .submit'  : 'authenticate',
            'keypress #login-form input' : 'authenticateOnEnter',
            
            // Settings form
            'click #settings'               : 'showSettings',
            'click #settings-form .submit'  : 'saveSettings',
            'keypress #settings-form input' : 'saveSettingsOnEnter',
            
            // Registration form
            'click #signup'               : 'showSignup',
            'click #signup-form .submit'  : 'register',
            'keypress #signup-form input' : 'registerOnEnter',
            
            // Search form
            'keypress #search'  : 'searchOnEnter',
            'click #search-now' : 'searchOnEnter',
            
            // Friends
            'click #friend-list .title'   : 'toggleFriendList',
            'click #favorite-list .title' : 'toggleFavoriteList',
            'click #start-menu .title'    : 'toggleSidebar'
        },
        
        // Constructor
        initialize : function(options) {
            _.bindAll(this, 
                'render', 'toggleNav',
                'addRoom', 'showCreateRoom', 'createRoom', 'allRooms', 'roomsReady',
                'addUser', 'allUsers', 'usersReady', 'authenticate', 'register', 'logout',
                'toggleSidebar',
                'toggleFriendList', 'allFriends', 'addFriend',
                'toggleFavoriteList', 'allFavorites', 'addFavorite',
                'conversationsReady', 'allConversations', 'addConversation'
            );

            // Set the application model directly, since there is a 
            // one to one relationship between the view and model
            this.model = new ß.Models.ApplicationModel({
            
                // This can be used to represent different
                // servers, or instances of the program, since
                // it is the base ID of every model url path
                server : 's1'
            });
            this.model.view = this;
            
            // Application model event bindings
            this.model.bind('change', this.render);
            this.model.bind('subscribe', this.ready);
            
            // User collection event bindings
            this.model.users.bind('subscribe', this.usersReady);
            this.model.users.bind('add', this.addUser);
            this.model.users.bind('add', this.render);
            this.model.users.bind('change', this.render);
            this.model.users.bind('refresh', this.allUsers);
            this.model.users.bind('refresh', this.render);
            
            // Room collection event bindings
            this.model.rooms.bind('subscribe', this.roomsReady);
            this.model.rooms.bind('add', this.addRoom);
            this.model.rooms.bind('add', this.render);
            this.model.rooms.bind('change', this.render);
            this.model.rooms.bind('refresh', this.allRooms);
            this.model.rooms.bind('refresh', this.render);
            
            // Conversation event bindings
            ß.user.conversations.bind('subscribe', this.coversationsReady);
            ß.user.conversations.bind('add', this.addConversation);
            ß.user.conversations.bind('refresh', this.allConversation);
            
            // Render template contents
            var content = this.model.toJSON();
            var view = Mustache.to_html(this.template(), content);
            this.el.html(view);
            
            // Assign pre-pouplated locals from Express
            this.sid              = token;
            this.port             = port;
            this.version          = version;
            
            // Set shortcuts to collection DOM
            this.searchInput      = this.$('#search');
            this.userList         = this.$('#users');
            this.roomList         = this.$('#rooms');
            this.sidebar          = this.$('#sidebar');
            this.mainContent      = this.$('#main-content');
            this.loginDialog      = this.$('#login-dialog');
            this.signupDialog     = this.$('#signup-dialog');
            this.createRoomDialog = this.$('#create-room-dialog');
            this.settingsDialog   = this.$('#settings-dialog');
            this.overlay          = this.$('#overlay');
            this.roomName         = this.$('input[name="room"]');
            this.friends          = this.$('#friend-list');
            this.friendList       = this.$('.friends');
            this.favorites        = this.$('#favorite-list');
            this.favoriteList     = this.$('.favorites');
            this.conversationList = this.$('#conversations');
            
            // Navigation items for authentication toggling
            this.nav = {
                signup     : this.$('#signup'),
                login      : this.$('#login'),
                logout     : this.$('#logout'),
                settings   : this.$('#settings'),
                createRoom : this.$('#create-room')
            };
            this.nav.settings.hide();
            this.nav.logout.hide();
            
            // Internal sidebar settings, pull settings
            // from the cookie and bootstrap if required
            this.menuOpen      = $.cookie('menuOpen') || 'false';
            this.friendsOpen   = $.cookie('friendsOpen') || 'false';
            this.favoritesOpen = $.cookie('favoritesOpen') || 'false';
            
            if (this.menuOpen === 'true') {
                $(this.el).addClass('menuOpen');
            }
            
            if (this.friendsOpen === 'true') {
                this.friends.addClass('open');
            }
            
            if (this.favoritesOpen === 'true') {
                this.favorites.addClass('open');
            }
        },
        
        // Close modal keystroke listener
        hideOnEscape : function(e) {
            if (e.keyCode == 27) {
                this.hideDialogs();
            }
        },
        
        toggleSidebar : function() {
            if (this.menuOpen == 'true') {
                this.menuOpen = 'false';
                $(this.el).removeClass('menuOpen');
            } 
            else {
                this.menuOpen = 'true';
                $(this.el).addClass('menuOpen');
            }
            $.cookie('menuOpen', this.menuOpen);
        },
        
        toggleFriendList : function() {
            if (this.friendsOpen == 'true') {
                this.friendsOpen = 'false';
                this.friends.removeClass('open');
            } 
            else {
                this.friendsOpen = 'true';
                this.friends.addClass('open');
            }
            $.cookie('friendsOpen', this.friendsOpen);
        },
        
        // All rooms have been loaded into collection
        allFriends : function(friends) {
            this.friendList.html('');
            ß.user.friends.each(this.addFriend);
            
            // Refresh model statistics
            this.render();
        },
        
        // Add a single friend o the current veiw
        addFriend : function(friend) {
            var view = new ß.Views.FriendView({
                model : friend
            }).render();
            
            this.friendList
                .append(view.el);
        },
        
        toggleFavoriteList : function() {
            if (this.favoritesOpen == 'true') {
                this.favoritesOpen = 'false';
                this.favorites.removeClass('open');
            } 
            else {
                this.favoritesOpen = 'true';
                this.favorites.addClass('open');
            }
            $.cookie('favoritesOpen', this.favoritesOpen);
        },
        
        // All rooms have been loaded into collection
        allFavorites : function(favorites) {
            this.favoriteList.html('');
            ß.user.favorites.each(this.addFavorite);
            
            // Refresh model statistics
            this.render();
        },
        
        // Add a single room room to the current veiw
        addFavorite : function(favorite) {
            var view = new ß.Views.RoomView({
                model : favorite
            }).render();
            
            this.favoriteList
                .append(view.el);
        },
        
        conversationsReady : function(resp) {
            console.log('conversationsReady');
        },
        
        // All rooms have been loaded into collection
        allConversations : function(friends) {
            console.log('allConversations');
            this.conversationList.html('');
            ß.user.conversations.each(this.addConversation);
        },
        
        // Add a single friend o the current veiw
        addConversation : function(convo) {
            console.log('addConversation');
            var view = new ß.Views.ConversationView({
                model : convo
            }).render();
            
            this.conversationList
                .append(view.el);
        },
        
        // Refresh statistics
        render : function() {
            var totalOnline = this.model.online || 0;
            var totalUsers  = this.model.users.length || 0;
            var totalRooms  = this.model.rooms.length || 0;
            
            this.$('#app-stats').html(Mustache.to_html(this.statsTemplate(), {
                totalOnline : totalOnline,
                totalUsers  : totalUsers,
                totalRooms  : totalRooms,
                version     : this.version
            }));
            return this;
        },
        
        // The model has been subscribed to, and is now
        // synchronized with the ß.Server
        ready : function() {
        
        },
        
        // Create room keystroke listener, throttled function
        // returned to reduce load on the ß.Server
        searchOnEnter : _.debounce(function() {
            var self = this;
            var input = this.searchInput.val();
            var query = (input.length < 1) ? {} : {
                keywords : { $in : [ input ] }
            };
            
            this.model.rooms.fetch({
                query : query,
                error : function(code, msg, opt) {
                },
                finished : function(resp) {
                }
            });
            
        }, 1000),
        
        // Create room keystroke listener, throttled function
        // returned to reduce load on the ß.Server
        searchOnTab : function(e) {
            if (e.keyCode === $.ui.keyCode.TAB && $(this).data('autocomplete').menu.active) {
                event.preventDefault();
            }
        },
        
        // Alternate navigation based on user authentication
        toggleNav : function() {
            this.nav.signup.fadeOut(150);
            this.nav.login.fadeOut(150);
            this.nav.settings.fadeIn(150);
            this.nav.logout.fadeIn(150);
            this.nav.createRoom.fadeIn(150);
        },
        
        // Remove all defined dialoges from the view
        hideDialogs : function() {
            this.loginDialog.hide();
            this.signupDialog.hide();
            this.createRoomDialog.hide();
            this.settingsDialog.hide();
            this.overlay.hide();
        },
        
        // Room collection has been subscribed to
        roomsReady : function() {
        
        },
        
        // All rooms have been loaded into collection
        allRooms : function(rooms) {
            this.roomList.html('');
            this.model.rooms.each(this.addRoom);
            
            // Refresh model statistics
            this.render();
        },
        
        // Show the sidebar user list
        showRooms : function() {
            this.userList.fadeOut(150);
            this.roomList.fadeIn(150);
        },
        
        // Add a single room room to the current veiw
        addRoom : function(room) {
            var view = new ß.Views.RoomView({
                model : room
            }).render();
            
            this.roomList
                .append(view.el);
        },
        
        deactivateRoom : function() {
            this.mainContent
                .fadeOut(50, function(){
                    $(this).html('');
                });
            
            // Join Channel
            this.activeRoom && this.activeRoom.remove();
        },
        
        activateRoom : function(params) {
            // Should probably hide room instead, maybe 
            // minimize it to the bottom toolbar
            this.deactivateRoom();
            
            
            // Get model by slug
            var model = this.model.rooms.filter(function(room) {
                return room.get('slug') === params;
            });
            if (!model || !model[0]) {
                Backbone.history.saveLocation('/');
                return;
            }
            
            // Create a new main room view
            this.activeRoom = new ß.Views.RoomMainView({
                model : model[0]
            }).render();
            
            var self = this;
            this.mainContent
                .fadeIn(75, function(){
                    $(this).html(self.activeRoom.el);
                    self.activeRoom.messageList.scrollTop(
                    
                        // Scroll to the bottom of the message window
                        self.activeRoom.messageList[0].scrollHeight
                    );
                    delete self;
                })
                .find('input[name="message"]').focus();
            
            model[0].view && model[0].view.activate();
        },
        
        // Create new room room
        createRoom : function() {
            // User input
            var name        = this.$('input[name="room"]'),
                //tags        = this.$('input[name="tags"]'),
                //image       = this.$('input[name="image"]'),
                //restricted  = this.$('input[name="restricted"]'),
                description = this.$('textarea[name="description"]');
            
            // Validation
            if (!name.val()) return;
            
            // Delegate to Backbone.sync
            this.model.createRoom({
                name        : name.val(),
                //tags        : tags.val(),
                user_id     : ß.user.get('id') || ß.user.id,
                //restricted  : restricted.val(),
                description : description.val()
            });
            
            // Should probably pass this in a success function
            this.createRoomDialog.fadeOut(150);
            this.overlay.hide();
            
            // Reset fields
            name.val('');
            //tags.val('');
            //image.val('');
            //restricted.val('');
            description.val('');
        },
        
        // Create room keystroke listener
        createRoomOnEnter : function(e) {
            if (e.keyCode == 13) this.createRoom();
        },
        
        // Show the login form
        showCreateRoom : function() {
            this.hideDialogs();
            this.overlay.fadeIn(150);
            this.createRoomDialog
                .html(Mustache.to_html(this.createRoomTemplate()))
                .fadeIn(150, function(){
                })
                .find('input[name="room"]').focus();
        },
        
        // Users collection has been subscribed to
        usersReady : function() {
            // Online user test
            ß.Server.onlineUsers(function(resp) {
            });
        },
        
        // Remove user profile from DOM
        deactivateUser : function() {
            this.mainContent
                .fadeOut(50, function(){
                    $(this).html('');
                });
                
            this.activeUser && this.activeUser.remove();
        },
        
        // Show the user profile / main view
        activateUser : function(params) {
            this.deactivateUser();
            
            // Get model by ID
            var model = this.model.users.filter(function(room) {
                return room.get('username') === params
                    || room.get('id') === params;
            });
            if (!model) {
                Backbone.history.saveLocation('/');
                return;
            }
            
            this.activeUser = new ß.Views.UserMainView({
                model : model[0]
            }).render();
            
            var self = this;
            this.mainContent
                .fadeIn(75, function(){
                    $(this)
                        .html(self.activeUser.el)
                        .find('.avatar')
                        .fadeIn(1500);
                })
        },
        
        // Show the login form
        showSettings : function() {
            this.hideDialogs();
            this.overlay.fadeIn(150);
            this.settingsDialog
                .html(Mustache.to_html(this.settingsTemplate(), ß.user.toJSON()))
                .fadeIn(150, function(){
                })
                .find('input[name="displayname"]').focus();
        },
        
        // Save updated user settings
        saveSettings : function() {
            var data = {
                bio         : this.$('textarea[name="bio"]').val(),
                email       : this.$('input[name="email"]').val(),
                password    : this.$('input[name="password"]').val(),
                displayName : this.$('input[name="displayname"]').val()
            };
            var self = this;
            ß.user.save(data, {
                channel  : 'app:users',
                finished : function(resp) {
                }
            });
            this.settingsDialog.fadeOut(150);
            this.overlay.hide();
        },
        
        // Create room keystroke listener
        saveSettingsOnEnter: function(e) {
            if (e.keyCode == 13) this.saveSettings();
        },
        
        // Show the sidebar user list
        showUsers : function() {
            this.roomList.fadeOut(150);
            this.userList.fadeIn(150);
        },
        
        // All rooms have been loaded into collection
        allUsers : function(users) {
            this.userList.html('');
            this.model.users.each(this.addUser);
            
            // Refresh model statistics
            this.render();
        },
        
        // Add a single room room to the current veiw
        addUser : function(user) {
            var view = new ß.Views.UserView({
                model : user
            }).render();
            
            this.userList
                .append(view.el);
        },
        
        // Show the login form
        showLogin : function() {
            this.hideDialogs();
            this.overlay.fadeIn(150);
            this.loginDialog
                .html(Mustache.to_html(this.loginTemplate()))
                .fadeIn(150, function(){
                    
                })
                .find('input[name="username"]').focus();
        },
        
        // Authenticate the current user, check the credentials
        // sent on the ß.Server side, which will return the client 
        // data to update the default model with
        authenticate : function() {
            var data = {
                username : this.$('input[name="username"]').val(),
                password : this.$('input[name="password"]').val()
            };
            
            var options = {
                token : this.sid,
                error : function(code, data, options) {
                },
            };
            
            var self = this;
            ß.user.authenticate(data, options, function(resp) {
                self.toggleNav();
            });
            this.loginDialog.hide();
            this.overlay.hide();
        },
        
        // Authentication keystroke listener
        authenticateOnEnter: function(e) {
            if (e.keyCode == 13) this.authenticate();
        },
        
        // Show the login form
        showSignup : function() {
            this.hideDialogs();
            this.overlay.fadeIn(150);
            this.signupDialog
                .html(Mustache.to_html(this.signupTemplate()))
                .fadeIn(150, function(){
                })
                .find('input[name="username"]').focus();
        },
        
        // Authenticate the current user, check the credentials
        // sent on the ß.Server side, which will return the client 
        // data to update the default model with
        register : function() {
            var data = {
                username    : this.$('input[name="username"]').val(),
                displayName : this.$('input[name="displayname"]').val(),
                email       : this.$('input[name="email"]').val(),
                password    : this.$('input[name="password"]').val(),
            };
            var options = {
                token : this.sid,
                error : function(code, data, options) {
                }
            };
            
            var self = this;
            ß.user.register(data, options, function(resp) {
                self.toggleNav();
            });
            this.signupDialog.hide();
            this.overlay.hide();
        },
        
        // Registration keystroke listener
        registerOnEnter: function(e) {
            if (e.keyCode == 13) this.register();
        },
        
        // Destroy the current user object and restore original
        // navigation display
        logout : function() {
            ß.user.logout({
                token : this.sid
            });
            
            this.friendList.html('');
            this.favoriteList.html('');
            ß.user = new ß.Models.UserModel();
            
            this.conversationList.html('');
            ß.user.conversations = new ß.Models.ConversationCollection();
            
            this.nav.signup.fadeIn(150);
            this.nav.login.fadeIn(150);
            this.nav.settings.fadeOut(150);
            this.nav.logout.fadeOut(150);
            this.nav.createRoom.fadeOut(150);
        },
        
    });
})(ß)