﻿(function(ß) {
    // Room model
    // ------------------
    
    // Room room
    ß.Models.RoomModel = Backbone.Model.extend({
    
        type  : 'room',
        
        defaults : {
            name      : 'Unknown',
            messages  : [],
            upvotes   : 0,
            downvotes : 0,
            rank      : 0,
            tags      : [
                'general'
            ],
            banned    : []
        },
        
        // Remove this view from the DOM, and unsubscribe from 
        // all future updates to the message collection
        remove : function() {
            //this.messages.unsubscribe();
        },
        
        allowedToEdit : function(user) {
            if (!user.get('id') || !this.get('user_id')) {
                return false;
            }
            return user.get('id') === this.get('user_id');
        },
        
        allowedToView : function(user) {
            return _.indexOf(this.get('banned'), user.get('id')) === -1;
        }
    });
    
    ß.Models.PrivateRoomModel = ß.Models.RoomModel.extend({
    
        defaults : {
            name      : 'Unknown',
            messages  : [],
            allowed   : [],
            banned    : []
        },
        
        allowedToView : function(user) {
            return _.indexOf(this.get('allowed'), user.get('id')) !== -1
                || user.get('id') === this.get('user_id');
        }
        
    });
    
    // Room Collection
    ß.Models.RoomCollection = Backbone.Collection.extend({
        
        model : ß.Models.RoomModel,
        url   : 'rooms',
        type  : 'room',
        
        // Initialize
        initialize : function(options) {
        },
        
        // Sorting for rankings
        comparator : function(room) {
            var now        = new Date().getTime(),
                then       = new Date(room.get('created')).getTime(),
                comparison = (now - then) / 500000;
        
            return room.get('downvotes') - room.get('upvotes') + comparison;
        }
    });
        
    ß.Models.ConversationModel = ß.Models.RoomModel.extend({
    
        defaults : {},
        type     : 'conversation',
    });
    
    ß.Models.ConversationCollection = ß.Models.RoomCollection.extend({
        
        model : ß.Models.ConversationModel,
        url   : 'conversations',
        type  : 'conversation',
        
    });
    
})(ß)