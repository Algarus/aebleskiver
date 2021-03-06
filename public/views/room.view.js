//    Aebleskiver
//    (c) 2011 Beau Sorensen
//    Aebleskiver may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/aebleskiver

(function(ß) {
    // Room room Views
    // -----------------
    
    // Both the simple 'Room' view and the full 'MainRoom'
    // view share the same room model, with the main difference
    // being that the 'Room' view does not hold a message
    // collection, and provides different updates
    
    //##RoomView
    // View element for the basic room model, primarily used to 
    // represent a list element version of the model
    ß.Views.RoomView = Backbone.View.extend({
    
        // DOM attributes
        tagName        : 'div',
        className      : 'room inactive',
        template       : _.template($('#room-list-template').html()),
        rankTemplate   : _.template($('#room-rank-template').html()),
        
        // User interaction events
        events : {
            'click .upvote'   : 'upVote',
            'click .downvote' : 'downVote'
        },
        
        //###initialize
        // Default constructor
        initialize : function(options) {
            // Bind to model
            _.bindAll(this, 'render', 'highlight', 'remove', 'statistics');
            
            this.model.view = this;
            this.model.bind('change', this.statistics);
            this.model.bind('remove', this.remove);
            this.loaded = 0;
        },
        
        //###render
        // Create the DOM element to represent this view, 
        // apply all UI and formatting as well
        render : function() {
            // Send model contents to the template
            var content = this.model.toJSON();
            
            // Pre-rendering formatting to prevent XSS
            content.name = this.model.escape('name');
            content.description = this.model.escape('description');
            
            var view = Mustache.to_html(this.template(), content);            
            $(this.el).html(view);
            this.statistics();
            return this;
        },
        
        //###statistics
        // Refresh view with new statistics
        statistics : function() {
            console.log('statistics', this);
            var rank = this.model.get('upvotes') - this.model.get('downvotes'),
                view = Mustache.to_html(this.rankTemplate(), {
                    rank : rank
                });
            
            this.$('.ranking').html(view);
            return this;
        },
        
        //###highlight
        // Create a 'flash' effect for the view, an attempt
        // to notify the user that a new message has been made
        highlight : _.debounce(function() {
            if (this.loaded) {
                $(this.el).effect('highlight', {
                    color : '#5d5d5d'
                }, 1200);
            }
            this.loaded = 1;
        }, 1200),
        
        //###remove
        // Remove this view from the DOM.
        remove : function() {
            $(this.el).remove();
        },
        
        //###upvote
        // Increment the room ranking
        upVote : _.debounce(function() {
            this.model.save({upvotes : this.model.get('upvotes') + 1});
            this.model.collection.sort();
        }, 500),
        
        //###downVote
        // Decrement the room ranking
        downVote : _.debounce(function() {
            this.model.save({downvotes : this.model.get('downvotes') + 1});
            this.model.collection.sort();
        }, 500),
        
        //###activate
        // Join Channel
        activate : function() {            
            $(this.el)
                .addClass('active')
                .addClass('current')
                .removeClass('inactive')
                .siblings()
                .addClass('inactive')
                .removeClass('current');
        },
        
        // Leave Channel
        leave : function() {            
            $(this.el)
                .removeClass('active')
                .removeClass('current')
                .addClass('inactive');
        },
    });
    
    //##RoomMainView
    // View representation of an activated room, which has the methods
    // and views for messages, expanded view with all of the trimmings
    ß.Views.RoomMainView = Backbone.View.extend({
    
        // DOM attributes
        tagName        : 'div',
        className      : 'main-room',
        template       : _.template($('#room-template').html()),
        statsTemplate  : _.template($('#room-stats-template').html()),
        
        // Internal memory of the last client to create a message
        lastPoster : '',
        
        // User interaction events
        events : {
            'keypress .message-form input' : 'createMessageOnEnter',
            'click #message-submit'        : 'createMessage',
            'click #leave-room'            : 'leave',
            'click #add-favorite'          : 'addToFavorites',
            'click #remove-favorite'       : 'removeFromFavorites',
            'click .delete-room'           : 'deleteRoom',
        },
        
        //###initialize
        // View constructor
        initialize : function(options) {
            this.viewable = this.model.allowedToView(ß.user);
            if (!this.viewable) {
                return;
            }
            
            _.bindAll(this, 
                'allMessages', 'addMessage', 'createMessage', 'render',
                'remove', 'statistics'
            );
            
            // Bind to model
            this.model.mainView = this;
            this.model.bind('change', this.statistics);
            this.model.bind('remove', this.remove);
            
            this.model.messages = new ß.Models.MessageCollection();
            this.model.messages.url = _.getUrl(this.model) + ':messages';
            
            this.model.messages.bind('add',   this.addMessage);
            this.model.messages.bind('reset', this.allMessages);
            this.model.messages.bind('add',   this.statistics);
            
            // Create the DOM element
            this.render();
            
            this.editable = this.model.allowedToEdit(ß.user);
            // Check if the current user is the room creator
            if (this.editable) {
                $(this.el).addClass('editable');
            } else {
                this.$('.admin-controls').remove();
            }
            
            var self = this;
            // Subscribe to the server for all model changes
            this.model.messages.subscribe({}, function() {
                self.model.messages.fetch({
                    query    : {room_id : self.model.get('id')},
                    sorting  : {sort: [['created',-1]], limit: 20},
                    finished : function(data) {
                    },
                });
            });
        },
        
        //###render
        // Create the DOM representation of this view
        render : function() {
            // Send model contents to the template
            var content = this.model.toJSON(),
                self    = this;
            
            // Pre-formatting to prevent XSS
            content.name = this.model.escape('name');
            content.description = this.model.escape('description');
            
            var view = Mustache.to_html(this.template(), content);            
            $(this.el).html(view);
            
            // Set shortcut methods for DOM items
            this.title       = this.$('.headline');
            this.controls    = this.$('.controls');
            this.description = this.$('.description');
            this.input       = this.$('.create-message');
            this.messageList = this.$('.messages');
            
            // Post-formatting, done here as to prevent conflict
            // with Mustache HTML entity escapement
            this.title.html(_.linkify(self.model.escape('name')));
            this.description.html(_.linkify(self.model.escape('description')));
            
            this.input.focus();
            return this;
        },
        
        //###statistics
        // Refresh the view with new statistical values
        statistics : function() {
            var totalMessages = this.model.messages.length;
            this.$('.room-stats').html(Mustache.to_html(this.statsTemplate(), {
                totalMessages : totalMessages
            }));
            return this;
        },
        
        //###deleteRoom
        // Delegate to the server to destroy this model
        deleteRoom : function() {
            this.model.destroy();
        },
        
        //###addToFavorites
        // Add this room to the current users favorite list, 
        // for easy lookups in the future
        addToFavorites : function() {
            if (this.model.get('id') == ß.user.get('id')
                || this.model.get('id') == ß.user.id) {
                return;
            }
            var favorites = ß.user.get('favorites') || [],          
                find = _.indexOf(favorites, this.model.get('id'));
            
            if (find !== -1) {
                return;
            }
            favorites.push(this.model.get('id'));
            
            ß.user.set({
                favorites : _.unique(favorites)
            }).save();
            
            ß.user.favorites.add(this.model);
        },
        
        //###removeFromFavorites
        // Remove the model from the current users favorites
        removeFromFavorites : function() {
            var id = this.model.get('id'),
                favorites = _.without(ß.user.get('favorites'), id);
            
            var person = ß.user.favorites.get(id);
            $(person.view.el).remove();
            
            ß.user.favorites.remove(this.model, {
                silent : true
            });
            ß.user.set({
                favorites : favorites
            }).save();
        },
        
        //###leave
        // Tell the application to remove this room
        leave : function() {
            Backbone.history.saveLocation('/');
            this.view.deactivateRoom(this.model);
        },
        
        //###remove
        // Remove this view from the DOM, and unsubscribe from 
        // all future updates to the message collection
        remove : function() {
            this.model.view && this.model.view.leave();
            this.model && this.model.remove();
            this.model.messages.unsubscribe();
            $(this.el).remove();
        },
        
        //###concurrency
        // Check through each sorted message to see which messages 
        // were made by the same user in a row
        concurrency : function(message) {
            message.concurrent = (message.get('user_id') === this.lastPoster) ? true : false;
            this.lastPoster = message.get('user_id');
        },
        
        //###allMessages
        // All rooms have been loaded into collection
        allMessages : function(messages) {
            this.messageList.html('');
            //this.model.messages.each(this.concurrency);
            this.model.messages.each(this.addMessage);
            this.statistics()
                .messageList
                .delay(400)
                .animate({scrollTop : this.messageList[0].scrollHeight}, 1000, 'easeInExpo');
                //.scrollTop(this.messageList[0].scrollHeight);
        },
        
        //###addMessage
        // Add a given model to the view
        addMessage : function(message) {
            //this.concurrency(message);
            
            var view = new ß.Views.MessageView({
                model : message
            }).render();
            
            this.model.view && this.model.view.highlight();
            this.messageList.append(view.el)
                .scrollTop(this.messageList[0].scrollHeight);
            
            // Check to see if the user is at the bottom of the list,
            // before scrolling, allowing them to read old msg's
            console.log('room.view: list:',this.messageList.height());
            console.log('room.view: scrollTop:',this.messageList.scrollTop());
            /**
            if (this.messageList.scrollTop() + 100 >= this.messageList.height()) {
                this.messageList
                    .animate({scrollTop : this.messageList[0].scrollHeight});
            }
            **/
        },
        
        //###createMessage
        // Delegate to the model to create a new message on the 
        // server, pulling the values from the DOM
        createMessage : function() {
            if (!this.input.val()) return;
            this.model.messages.create(this.newAttributes());
            this.input.val('');
        },
        
        //###createMessageOnEnter
        // Create message keystroke listener
        createMessageOnEnter : function(e) {
            if (e.keyCode == 13) this.createMessage();
        },
        
        //###newAttributes
        // Retrieve new attributes for the model based on user 
        // input collected from the DOM
        newAttributes : function() {
            var username    = ß.user.get('username'),
                displayName = ß.user.get('displayName') || ß.user.get('username'),
                id          = ß.user.get('id') || ß.user.id;
            
            return {
                text        : this.input.val(),
                room_id     : this.model.get('id'),
                user_id     : id,
                username    : username,
                displayName : displayName,
                avatar      : ß.user.get('avatar')
            };
        },
    });
    
    //##ConversationView
    // Representation of a user to user conversation (room)
    ß.Views.ConversationView = ß.Views.RoomMainView.extend({
    
        // DOM attributes
        tagName        : 'div',
        className      : 'conversation open',
        template       : _.template($('#conversation-template').html()),
        statsTemplate  : _.template($('#room-stats-template').html()),
        
        // User interaction events
        events    : {
            'click .heading'               : 'toggleOpen',
            'keypress .message-form input' : 'createMessageOnEnter',
            'click .message-form button'   : 'createMessage',
            'click .destroy'               : 'remove',
            'click .add-favorite'          : 'addToFavorites',
            'click .remove-favorite'       : 'removeFromFavorites',
            'click .delete-room'           : 'deleteRoom',
        },
        
        //###initialize
        // Constructor
        initialize : function(options) {
            this.viewable = this.model.allowedToView(ß.user);
            if (!this.viewable) {
                return;
            }
            
            _.bindAll(this, 
                'allMessages', 'addMessage', 'createMessage', 'render',
                'remove', 'statistics'
            );
            
            // Bind to model
            this.model.mainView = this;
            this.model.bind('change', this.statistics);
            this.model.bind('remove', this.remove);
            
            this.model.messages = new ß.Models.MessageCollection();
            this.model.messages.url = _.getUrl(this.model) + ':messages';
            
            this.model.messages.bind('add',   this.addMessage);
            this.model.messages.bind('reset', this.allMessages);
            this.model.messages.bind('add',   this.statistics);
            
            this.render();
            var self = this;
            
            // Post-formatting, done here as to prevent conflict
            // with Mustache HTML entity escapement
            content.name        && this.title.html(_.linkify(content.name));
            content.description && this.description.html(_.linkify(content.description));
            
            this.model.messages.subscribe({}, function() {
                self.model.messages.fetch({
                    query    : {room_id : self.model.get('id')},
                    sorting  : {sort: [['created',-1]], limit: 20},
                    finished : function(data) {
                    },
                });
            });
            
            this.input.focus();
        },
        
        //###render
        // Create the DOM representation of this view
        render : function() {
            // Send model contents to the template
            var content = this.model.toJSON();
            var view = Mustache.to_html(this.template(), content);            
            $(this.el)
                .html(view)
                .find('[title]')
                .wijtooltip();
            
            // Set shortcut methods for DOM items
            this.title       = this.$('.headline');
            this.controls    = this.$('.controls');
            this.description = this.$('.description');
            this.input       = this.$('.create-message');
            this.messageList = this.$('.messages');
            
            return this;
        },
        
        //###startConversation
        // Initialize a new conversation with another room, 
        // delegate to the server to send that user a notice
        startConversation : _.debounce(function() {
            var self = this;
            ß.Server.startConversation(ß.user.toJSON(), {
                channel : self.model.url,
                id      : self.model.get('to')
            }, function(resp, options) {
                // Conversation started
            });
        }, 1000),
        
        //###remove
        // Remove this view from the DOM, and unsubscribe from 
        // all future updates to the message collection
        remove : function() {
            this.model && this.model.remove();
            this.model.unsubscribe();
            this.model.messages.unsubscribe();
            $(this.el).remove();
            
            delete this.model;
            delete this;
        },
        
        //###toggleOpen
        toggleOpen : function() {
            $(this.el).toggleClass('open');
        },
    
    });
    
})(ß)