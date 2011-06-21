//    Aebleskiver
//    (c) 2011 Beau Sorensen
//    Aebleskiver may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/aebleskiver

(function(ß) {
    // Message view
    // ------------
    
    // Single room message
    ß.Views.MessageView = Backbone.View.extend({
        
        // DOM attributes
        tagName   : 'li',
        className : 'message',
        template  : _.template($('#message-template').html()),
    
        // Constructor
        initialize : function(options) {
            _.bindAll(this, 'render');
            this.model.bind('change', this.render);
            this.model.view = this;
        },
        
        // Remove this view from the DOM.
        remove : function() {
            $(this.el).remove();
        },
    
        // Render contents
        render : function() {
            var content = this.model.toJSON();
            
            // Switch name and ID for an anonymous user, they can only be 
            // looked up via session id, instead of username
            console.log('render', content.username);
            if (content.username === 'anonymous') {
            console.log('anonymous', content);
                content.displayName || (content.displayName = content.username);
                content.username = content.user_id;
            }
            
            // Pre-formatting 
            content.text = this.model.escape('text');
            content.created && (content.created = _.timeFormat(content.created));
            
            var view = Mustache.to_html(this.template(), content);
            $(this.el).html(view);
            
            this.model.concurrent && $(this.el).addClass('concurrent');
            
            // Post-formatting, done here as to prevent conflict
            // with Mustache HTML entity escapement
            this.$('.data')
                .html(_.linkify(content.text))
                .emoticonize({
                    //delay   : 800,
                    //animate : false
                    //exclude : 'pre, code, .no-emoticons'
                });
            
            // Make this a localStorage setting
            //this.$('.timeago').timeago();
            return this;
        }
    });

})(ß)
