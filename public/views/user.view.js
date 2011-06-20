﻿(function(ß) {
    // User views
    // -----------------
    
    // User
    ß.Views.UserView = Backbone.View.extend({
    
        // DOM attributes
        tagName   : 'div',
        className : 'user inactive',
        template  : _.template($('#user-list-template').html()),
        
        // Interaction events
        events : {
            'click' : 'activate'
        },
    
        initialize : function(options) {
            _.bindAll(this, 'render');
            
            this.model.bind('change', this.render);
            this.model.bind('remove', this.clear);
            this.model.view = this;
            this.render();
        },
    
        // Re-render contents
        render : function() {
            var content = this.model.toJSON();
            if (content.username === 'anonymous') {
                content.displayName || (content.displayName = content.username);
                content.username = content.id;
            }
            var view = Mustache.to_html(this.template(), content);
            $(this.el).html(view);
            return this;
        },
        
        // Remove this view from the DOM.
        remove : function() {
            this.el.remove();
        },
        
        // Join Channel
        activate : function() {            
            $(this.el)
                .addClass('current')
                .removeClass('inactive')
                .siblings()
                .addClass('inactive')
                .removeClass('current');
        },
    });
    
    // Friend
    ß.Views.FriendView = ß.Views.UserView.extend({
    
        // DOM attributes
        tagName   : 'div',
        className : 'user friend',
        template  : _.template($('#friend-list-template').html()),
        
        // Interaction events
        events : {
            'click' : 'startConversation',
        },
        
        // Force the 'friend' user into a conversation
        // with current user through RPC delegation
        startConversation : function() {
            this.model.startConversation();
        },
        
    });
    
    // User profile and wall
    ß.Views.UserMainView = Backbone.View.extend({
    
        // DOM attributes
        tagName        : 'div',
        className      : 'user-profile',
        template       : _.template($('#user-template').html()),
        statsTemplate  : _.template($('#user-stats-template').html()),
        
        // Interaction events
        events : {
            'keypress .post-form input' : 'createPostOnEnter',
            'click #post-submit'        : 'createPost',
            'click #leave-profile'      : 'deactivate',
            'click #add-friend'         : 'addToFriends',
            'click #remove-friend'      : 'removeFromFriends',
            'click #send-message'       : 'startConversation'
        },
    
        initialize : function(options) {
            _.bindAll(this, 
                'render', 'allPosts', 'addPost', 'createPost'
            );
            this.model.bind('change', this.render);
            this.model.bind('remove', this.remove);
            
            this.model.posts     = new ß.Models.MessageCollection();
            this.model.posts.url = this.model.url() + ':posts';
            
            this.model.posts.bind('add', this.addPost);
            this.model.posts.bind('reset', this.allPosts);
            this.model.posts.bind('add', this.render);
            
            this.model.view = this;
            
            var self = this;
            // Request a gravatar image for the current 
            // user based on email address
            ß.Server.gravatar({
                email : self.model.get('email'),
                size  : 100
            }, function(resp) {
                self.model.set({ avatar : resp });
            });
            
            var content = this.model.toJSON(),
                view = Mustache.to_html(this.template(), content);   
            $(this.el).html(view);
            
            // Set shortcut methods for DOM items
            this.input    = this.$('.create-post');
            this.postList = this.$('.posts');
            this.input.focus();
            
            // Subscribe to the user's message wall for 
            // changes and new messages
            this.model.posts.subscribe({}, function() {
                self.model.posts.fetch({
                    query    : {room_id : self.model.get('id')},
                    finished : function(data) {
                    },
                });
            });
            return this;
        },
        
        // Force the 'friend' user into a conversation
        // with current user through RPC delegation
        startConversation : function() {
            this.model.startConversation();
        },
        
        // Add user to current user's friend list
        addToFriends : function() {
            if (this.model.get('id') == ß.user.get('id')
                || this.model.get('id') == ß.user.id) {
                return;
            }
            
            var friends = ß.user.get('friends') || [],
                find    = _.indexOf(friends, this.model.get('id'));
            
            if (find !== -1) {
                return;
            }
            friends.push(this.model.get('id'));
            
            // Make sure we are not duplicating any friends by 
            // ensuring that the array of keys is unique
            ß.user.set({
                friends : _.unique(friends)
            }).save();
            
            ß.user.friends.add(this.model);
        },
        
        // Delete user from current user's friend list
        removeFromFriends : function() {
            var id      = this.model.get('id'),
                friends = _.without(ß.user.get('friends'), id),
                person  = ß.user.friends.get(id);
            
            // Make sure we have a valid user
            if (!person) {
                return false;
            }
            
            // Remove DOM element from view
            $(person.view.el).remove();
            
            // Remove from model and save to server
            ß.user.friends
                .remove(this.model, {
                    silent : true
                })
                .set({
                    friends : friends
                })
                .save();
        },
    
        // Render contents
        render : function() {
            var totalPosts = this.model.posts.length;
            this.$('.user-stats').html(Mustache.to_html(this.statsTemplate(), {
                totalPosts : totalPosts
            }));
            return this;
        },
        
        // Remove this view from the DOM.
        remove : function() {
            this.model && this.model.remove();
            $(this.el).remove();
        },
        
        // Join Channel
        activate : function() {            
            $(this.el)
                .addClass('current')
                .removeClass('inactive')
                .siblings()
                .addClass('inactive')
                .removeClass('current');
        },
        
        // Tell the application to remove this room
        deactivate : function() {
            Backbone.history.saveLocation('/');
            this.view.deactivateUser(this.model);
        },
        
        // All rooms have been loaded into collection
        allPosts : function(posts) {
            this.postList.html('');
            this.model.posts.each(this.addPost);
            this.render();
        },
        
        addPost : function(post) {
            var view = new ß.Views.MessageView({
                model : post
            }).render();
            
            this.postList
                .append(view.el)
                .scrollTop(this.postList[0].scrollHeight);
        },
        
        // Send a post to the ß.Server
        createPost : function() {
            if (!this.input.val()) return;
            this.model.posts.create(this.newAttributes());
            this.input.val('');
        },
        
        // Create post keystroke listener
        createPostOnEnter : function(e) {
            if (e.keyCode == 13) this.createPost();
        },
        
        // Generate the attributes
        newAttributes : function() {
            var username = ß.user.get('username'),
                id       = ß.user.get('id') || ß.user.id;
            
            return {
                text        : this.input.val(),
                room_id     : this.model.get('id'),
                user_id     : id,
                username    : (username == ß.Models.UserModel.defaults) ? id : ß.user.get('username'),
                displayName : ß.user.get('displayName') || ß.user.get('username'),
                avatar      : ß.user.get('avatar')
            };
        },
    });
})(ß)