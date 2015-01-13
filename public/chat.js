$(document).ready(function () {
	
	// Init server connection throught Web socket.
    var socket = io.connect(location.origin);

    // Availables Twitch emotes for the chat
    var twitchEmotes = null;

    // Store all user's nickname of current room. Real-time updated.
    var pseudos = [];

    // Retrieves all availables twitch emotes from dedicated WebService.
    $.getJSON('//twitchemotes.com/api_cache/v2/global.json')
        .done(function(json){
            // Store retrieved emotes.
            twitchEmotes = json;
        });

    /**
     * Replace all occurences in a string through Regexp.
     * @param  {String} find - Occurences to find/replace
     * @param  {String} replace - Value to set on occurences
     * @param  {String} str - String containing possibles occurences
     * @return {String} Computed new string.
     */
    var replaceAll = function(find, replace, str) {
      return str.replace(new RegExp(find, 'g'), replace);
    }

    /**
     * Generate a Hex color from string
     * @param  {String}
     * @return {String}
     */
    var stringToColour = function(str) {
        // str to hash
        for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 5) - hash));
        // int/hash to hex
        for (var i = 0, colour = "#"; i < 3; colour += ("00" + ((hash >> i++ * 8) & 0xFF).toString(16)).slice(-2));
        return colour;
    };

    /**
     * Replace emote text with emote imgs
     * @param  {String}
     * @return {String}
     */
    var insertEmotesInContent = function(content){
        if(twitchEmotes != null) {
            $.each(twitchEmotes.emotes, function(emoteName, emote) {
                content = replaceAll(emoteName, '<img src="'+twitchEmotes.template.small.replace('{image_id}', emote.image_id)+'" />', content);
            });
        }
        return content;
    };

    /**
     * Add styles on user pseudo if present in message content.
     * @param  {String}
     * @return {String}
     */
    var highlightMyPseudo = function(content) {
        content = replaceAll(myPseudo, '<span class="highlight-pseudo">'+myPseudo+'</span>', content);
        return content;
    }

    /**
     * When user has choosing its nickname.
     * @param  {Event}
     */
    $('.choose-pseudo form').on('submit', function (e) {
    	e.preventDefault();
    	var userPseudo = $('.user-pseudo').val();
    	if(userPseudo != "") {
            // Sends the requested nickname to the server.
    		socket.emit('setPseudo', userPseudo);
    	}
    });

    /**
     * When server has tried to set the user's nickname.
     * Returns the user's nickname in case of success. Returns false otherwise.
     * @param  {String|Boolean}
     */
    socket.on('setPseudo', function (pseudo) {
        if(pseudo != false) {
            myPseudo = pseudo;
            $('.choose-pseudo').hide();
            $('.user-message').focus();

        } else {
            $('.choose-pseudo .form-group').addClass('has-error');
            $('.choose-pseudo label').text('Ce pseudo est déja utilisé.');
        }
    });

    /**
     * When an user connects/disconnects, server sends the updated nicknames list.
     * @param  {Array}
     */
    socket.on('refreshPseudos', function(newPseudos){
        pseudos = newPseudos;
    });

    /**
     * When current room has a new message.
     * @param  {Object}
     */
    socket.on('message', function(message){
        var newMessage = $('<div>').addClass("message");
        var contentText = message.content;
        var authorText = "";

        // Format message time & show/hide it
        var timeText = $('<span>').addClass("time hide");
        if($('input.showPostTime').is(':checked')) {
            timeText.removeClass('hide');
        }

        // Format time
        if(message.time != null) {
            var postTime = new Date(message.time);
            timeText.text(postTime.getHours()+':'+('0'+postTime.getMinutes()).slice(-2)+ ' ');
        }

        // Format author's name
    	if(message.author == 'system'){
            newMessage.addClass('system');

        } else if(message.author != null) {
            authorText  = $('<span>').addClass('author').attr('style', 'color:'+stringToColour(message.author)).text(message.author+ ': ');

            // Format message content
            contentText = insertEmotesInContent(contentText);
            contentText = highlightMyPseudo(contentText);
        }


        // Add the new message
        newMessage.append(timeText, authorText, contentText);
    	newMessage.appendTo($('.messages'));

        // Scroll room window to bottom
        $(".messages").animate({ 
            scrollTop: $(".messages").height() 
        }, "slow");

    });

    /**
     * When user posts a new message
     * @param  {Event}
     */
    $('form.user-post').on('submit', function(e){
    	e.preventDefault();
    	var userMessage = $('.user-message').val();
    	if(userMessage != "") {
            // Sends message to server
    		socket.emit('message', userMessage);
            // Clean input element
			$('.user-message').val("");
            $('.user-message').focus();
    	}
    });

    /**
     * On enable/disable show post time
     * @param  {Event}
     */
    $('input.showPostTime').on('change', function (e) {
        if($(this).is(':checked')) {
            // Display messages timestamp
            $('.message .time').removeClass('hide'); 

        } else {
            // Hide messages timestamp
            $('.message .time').addClass('hide'); 
        }
    });  

    // Options popover
    $('a.options').on('click', function(){
        $('.options-popover').toggle();
    });
    $('.options-popover').hide();

});