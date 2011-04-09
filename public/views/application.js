(function(Views) {
    // Application view
    // -----------------
    
    // Application
    Views.ApplicationView = Backbone.View.extend({
        // DOM element
        className : 'wrapper',
        tagName   : 'div',
        
        // The DOM events specific to an item.
        events : {
            "submit #chat-form" : "createChat",
        },
        
        // Mustache Template
        template : _.template($('#application-template').html()),
        
        // Initialization
        initialize : function(options) {
            _.bindAll(this, 'render', 'addChat', 'createChat', 'addUser', 'addGame', 'createGame');    
            this.render = _.bind(this.render, this);

            // Set the model directly
            this.model = new Models.ApplicationModel({
                id : 's1'
            });
            
            // Bind chats collection
            this.model.users.bind('add', this.addUser);
            this.model.chats.bind('add', this.addChat);
            
            // Send model contents to Mustache
            var content = this.model.toJSON();
            var view = Mustache.to_html(this.template(content), content);            
            $(this.el).html(view);
            
            var key = $('#client').html();
            window.user = new Models.UserModel({id : key});
            
            // Set shortcuts to collection DOM
            this.userInput = $(this.el).find('#create-user');
            this.chatInput = $(this.el).find('#create-chat');
            
            this.userList = $(this.el).find('#users');
            this.chatList = $(this.el).find('#chats');
            
            var self = this;
            var userCallback = function(model) {
                window.user.set(model);
                window.user.set({
                    visits : model.visits + 1,
                    status : 'online',
                });
                Gravatar(model, {
                    finished : function(data) {
                        console.log('avatar', data);
                        if (!data) return;
                        window.user.set({ avatar : data.image }).save();
                    },
                    size : 40,
                });
            };
            // Callback for when server synchronization
            // has been completed
            var finished = function() {
                // Find all users
                Synchronize(window.user, {
                    fetch : {
                        finished : function(model) {
                            userCallback(model);
                        },
                        error : function(model) {
                            userCallback(model);
                        },
                    }
                });
                
                // Sync up with the server through DNode
                Synchronize(self.model.chats, {
                    // Fetch data from server
                    finished : function(data) {
                        // Set a model for each id found for lookups
                        _.each(self.model.attributes.chats, function(id) {
                            self.model.chats.add({id : id}, {silent : true});
                        });
                        
                        // Use backbone to fetch from the server
                        self.model.chats.each(function(chat) {
                            chat.fetch({
                                finished : function(data) {
                                    self.model.chats.add(data);
                                    
                                },
                            });
                        });
                    },
                });
            };
            
            // Sync up with the server through DNode
            Synchronize(this.model, {
                // Fetch data from server
                fetch : {
                    finished : function(data) {
                        // Increment some arbitrary number
                        self.model.set({visits : data.visits + 1}).save();
                        finished();
                    },
                    error : function(data) {
                        // No existing data could be found
                        self.model.save();
                        finished();
                    },
                },
            });
        },
        
        // Render contents
        render : function() {
            return this;
        },
        
        // Add a single chat room to the current veiw
        addUser : function(user) {
            var view = new Views.UserView({
                model : user
            }).render();
            
            $(this.el)
                .find('#users')
                .append(view.el);
        },
        
        // Add a single chat room to the current veiw
        addChat : function(chat) {
            chat.messages.url = chat.collection.url + ":" + chat.id + ":messages";
            
            var view = new Views.ChatView({
                model : chat
            }).render();
            
            console.log('add chat', chat);
            $(this.el)
                .find('#chats')
                .append(view.el);
        },
        
        deactivateChat : function() {
            $(this.el)
                .find('#main-content')
                .fadeOut(300, function(){
                    $(this).html('');
                });
                
            // Join Channel
            this.activeChat && this.activeChat.remove();
        },
        
        activateChat : function(params) {
            this.deactivateChat();
            
            
            // Get model by name
            var model = this.model.chats.get(params);
            console.log('model: ', model);
            
            if (!model) return;
            console.log('model: ', model.url());
        
            this.activeChat = new Views.ChatMainView({
                model : model
            }).render();
            
            var self = this;
            $(this.el)
                .find('#main-content')
                .fadeIn(300, function(){
                    $(this).html(self.activeChat.el);
                    self.activeChat.messagelist.scrollTop(
                        self.activeChat.messagelist[0].scrollHeight
                    );
                    delete self;
                });
        },
        
        // Generate the attributes for a new chat
        newChatAttributes : function() {
            return {
                name : this.chatInput.val()
            };
        },
        
        // Create new chat room
        createChat : function() {
            if (!this.chatInput.val()) return;
            
            var self = this;
            this.model.chats.create(this.newChatAttributes(), {
                finished : function(data) {
                    var keys = self.model.get('chats');
                    if (keys) {
                        keys.push(data.id);
                        if (keys.length > 50) keys = _.rest(keys, (keys.length - 50));
                        self.model.set({chats : _.uniq(keys)}).save();
                        delete keys;
                    }
                }
            });
            this.chatInput.val('');
        },
    });
})(Views)