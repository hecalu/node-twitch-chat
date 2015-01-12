// Load HTTP & FileSystem modules.
var http    = require('http');
var fs      = require('fs');

// Load Ent module to encode/decode HTML message.
var ent     = require('ent');

// Loads index HTML file and sends it to client
var server = http.createServer(function(req, res) {
    fs.readFile('./index.html', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});


// Load and init Socket module
var io = require('socket.io').listen(server);
var handshake = require('socket.io-handshake');

// Contains all connected pseudos
var pseudos = [];

/**
 * On socket connection between server & client
 * @param  {Object}
 */
io.sockets.on('connection', function (socket) {
    
    /**
     * When client requests for a new nickname
     * @param  {String}
     */
    socket.on('setPseudo', function(pseudo){
        // Check if pseudo is not already taken
        if(pseudos.indexOf(pseudo) != -1) {  
            // Refuses requested pseudo
            socket.emit('setPseudo', false);

        } else {
            // Store given pseudo
        	socket.pseudo = pseudo;
            pseudos.push(pseudo);
            // Inform client
        	socket.emit('setPseudo', pseudo);
            // Informs all attendees of new connection
            io.emit('message', {
                author: 'system',
                content: pseudo+' est maintenant connecté(e)'
            });
            // Informs all attendee of the updated nicknames list
            io.emit('refreshPseudos', pseudos);
        }
    });

    /**
     * When receiving new message
     * @param  {Object}
     */
    socket.on('message', function (message) {
        // Send given message to all attendees with author & server timestamp.
        io.emit('message', {
            author: socket.pseudo,
            content: ent.encode(message),
            time: new Date()
        });
    });

    /**
     * When user disconnects
     */
    socket.on('disconnect', function () {
        // Verify if user has set a nickname during chat session
        if(socket.hasOwnProperty('pseudo')){
            var pseudoIdx = pseudos.indexOf(socket.pseudo);
            if(pseudoIdx > -1) {
                // Remove user's nickname from list
                pseudos.splice(pseudoIdx, 1);
                // Update nicknames list of all attendees.
                io.emit('refreshPseudos', pseudos);
            }
            // Informs attendees about user logout.
        	socket.broadcast.emit('message', {
                author: 'system',
                content: socket.pseudo+' est déconnecté(e)'
            });
        }
    });
});

// Set server port
server.listen(8080);