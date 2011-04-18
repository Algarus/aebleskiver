(function(Views) {
    // Application view
    // -----------------
    
    // Application
    Views.ApplicationView = Backbone.View.extend({
    
        // DOM attributes
        template            : _.template($('#application-template').html()),
        statsTemplate       : _.template($('#application-stats-template').html()),
        loginTemplate       : _.template($('#login-template').html()),
        signupTemplate      : _.template($('#signup-template').html()),
        createRoomTemplate  : _.template($('#create-room-template').html()),
        
        // Interaction events
        events    : {
            "click #create-room"       : "showCreateRoom",
            "submit #login-form"       : "showCreateRoom",
            "submit #signup-form"      : "showCreateRoom",
            "submit #create-room-form" : "createRoom",
            "click .cancel"            : "hideDialogs",
        },
        
        // Constructor
        initialize : function(options) {
            _.bindAll(this, 'render', 'addRoom', 'createRoom', 'addUser');    
            this.render = _.bind(this.render, this);

            // Set the application model directly, since there is a 
            // one to one relationship between the view and model
            this.model = new Models.ApplicationModel({
            
                // This can be used to represent different
                // servers, or instances of the program, since
                // it is the base ID of every model url path
                id : 's1'
            });
            
            this.model.bind('change', this.render);
            this.model.users.bind('add', this.addUser);
            this.model.rooms.bind('add', this.addRoom);
            
            // Render template contents
            var content = this.model.toJSON();
            var view = Mustache.to_html(this.template(content), content);            
            this.el.html(view);
            
            // Set shortcuts to collection DOM
            this.userList         = this.$('#users');
            this.roomList         = this.$('#rooms');
            this.mainContent      = this.$('#main-content');
            this.loginDialog      = this.$('#login-dialog');
            this.signupDialog     = this.$('#signup-dialog');
            this.createRoomDialog = this.$('#create-room-dialog');
            
            this.render();
        },
        
        // Refresh statistics
        render : function() {
            console.log('app render', this);
            var totalUsers = this.model.users.length;
            var totalRooms = this.model.get('rooms').length;
            var totalMessages = 0;
            
            this.model.rooms.each(function(room){
                console.log('forEach', room);
                totalMessages += room.get('messages').length;
            });
            
            this.$('#app-stats').html(Mustache.to_html(this.statsTemplate(), {
                totalUsers    : totalUsers,
                totalRooms    : totalRooms,
                totalMessages : 0
            }));
            return this;
        },
        
        // Add a single room room to the current veiw
        addUser : function(user) {
            var view = new Views.UserView({
                model : user
            }).render();
            
            this.userList
                .append(view.el);
        },
        
        // Add a single room room to the current veiw
        addRoom : function(room) {
            var view = new Views.RoomView({
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
            this.deactivateRoom();
            
            // Get model by ID
            var model = this.model.rooms.get(params);
            if (!model) return;
            
            this.activeRoom = new Views.RoomMainView({
                model : model
            }).render();
            
            var self = this;
            this.mainContent
                .fadeIn(150, function(){
                    $(this).html(self.activeRoom.el);
                    self.activeRoom.messagelist.scrollTop(
                    
                        // Scroll to the bottom of the message window
                        self.activeRoom.messagelist[0].scrollHeight
                    );
                    delete self;
                });
        },
        
        // Create new room room
        createRoom : function() {
            var name = this.$('input[name="room"]');
            if (!name.val()) return;
            this.model.createRoom({
                name : name.val(),
            });
            this.createRoomDialog.fadeOut(150);
            name.val('');
        },
        
        hideDialogs : function() {
            this.loginDialog.fadeOut(150);
            this.signupDialog.fadeOut(150);
            this.createRoomDialog.fadeOut(150);
        },
        
        // Show the login form
        showCreateRoom : function() {
            this.hideDialogs();
            this.createRoomDialog
                .html(Mustache.to_html(this.createRoomTemplate()))
                .fadeIn(150, function(){
                });
                
            this.$('input[name="room"]').focus();
        },
        
        // Show the login form
        showLogin : function() {
            this.hideDialogs();
            this.loginDialog
                .html(Mustache.to_html(this.loginTemplate()))
                .fadeIn(150, function(){
                });
                
            this.$('#login input[name="username"]').focus();
        },
        
        // Show the login form
        showSignup : function() {
            this.hideDialogs();
            this.signupDialog
                .html(Mustache.to_html(this.signupTemplate()))
                .fadeIn(150, function(){
                });
                
            this.$('#register input[name="username"]').focus();
        },
    });
})(Views)