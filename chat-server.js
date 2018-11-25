// Require the packages we will use:
var http = require("http"),
socketio = require("socket.io"),
fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
// This callback runs when a new connection is made to our HTTP server.

fs.readFile("chat-client.html", function(err, data){
// This callback runs when the client.html file has been read from the filesystem.

if(err) return resp.writeHead(500);
resp.writeHead(200);
resp.end(data);
});
});
app.listen(3456);

// usernames which are currently connected to the chat
var allusers = [];
var user_socket_map = {};
var room_user_map = {};
var room_pwd_map = {};
var room_admin_map = {};
var room_ban_map = [];
var users_in_room = {};
users_in_room["publicRoom"] = [];

// rooms which are currently available in chat
var rooms = ['publicRoom'];

// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){

	//this below addUser logic is mostly based on below link: 
	//http://psitsmike.com/2011/10/node-js-and-socket-io-multiroom-chat-tutorial/
	//
	socket.on('addUser', function(username){
		for(i = 0 ; i <= allusers.length; i++){
			if(username === allusers[i]){
				socket.emit("signin_error");
				return;
			}
		};
		if(username == null){
			return;
		}
		allusers.push(username);
		console.log(allusers);
		// store the username in the socket session for this client
		user_socket_map[username] = socket;
		user_socket_map[username].username = username;
		// store the room name in the socket session for this client
		user_socket_map[username].room = 'publicRoom';
		// add the client's username to the global list
		room_user_map[username] = 'publicRoom';
		// send client to publicRoom

		//DK editing for user list not done
		users_in_room["publicRoom"].push(username);
		socket.emit("current_user", username);
		socket.emit("current_room", 'publicRoom');
		// io.to("publicRoom").emit("current_user_list", users_in_room["publicRoom"]);
		io.to("publicRoom").emit("current_user_list", users_in_room["publicRoom"]);
		socket.emit("current_user_list", users_in_room["publicRoom"]);
		io.to("publicRoom").emit("announcement", "ADMIN: " + username + " has entered publicRoom");

		socket.join('publicRoom');
		console.log("new user :" + username +" just entered the publicRoom");

		socket.emit('updateRoom', rooms)

		//*****chat updating logic is needed for managing chat for each room that a user is connected to. 
	});


	socket.on('switchRoom', function(username, targetroom, targetroompwd) {
		for(i = 0; i < rooms.length; i++){
			if(targetroom != rooms[i]){
				continue;
			} else{
				break;
			}
			return;
		}

		if(targetroom == "publicRoom"){

		}else if(targetroompwd !== room_pwd_map[targetroom]){
			socket.emit("error_msg", "Wrong Password!");
			return;
		}

		if(username == room_ban_map[targetroom]){
			socket.emit("error_msg", "You are permanetly banned from this room!");
			return;
		}

		if(users_in_room[targetroom].indexOf(username) != -1){
			socket.emit("error_msg", "You are already in this room!");
			return;
		}

		var current_room = room_user_map[username];
		var index = users_in_room[current_room].indexOf(username);
		if(index != -1){
			users_in_room[current_room].splice(index, 1);
		};
		io.to(current_room).emit("current_user_list", users_in_room[current_room]);
		user_socket_map[username].leave(socket.room);
		user_socket_map[username].join(targetroom);
		user_socket_map[username].room = targetroom;
		user_socket_map[username].emit("current_room", targetroom);
		users_in_room[targetroom].push(username);
		room_user_map[username] = targetroom;
		io.to(targetroom).emit("current_user_list", users_in_room[targetroom]);
		io.to(current_room).emit("announcement", "ADMIN: " + username + " has left " + current_room);
		io.to(targetroom).emit("announcement", "ADMIN: " + username + " has entered " + targetroom);
	});


	socket.on('addPrivateRoom', function(admin, addedroom, roompwd) {

		for(i = 0; i<rooms.length; i++){
			if(addedroom == rooms[i]){
				socket.emit("error_msg", "The room already exists!");
				return;
			}
		}
		var current_room = room_user_map[admin];
		var index = users_in_room[current_room].indexOf(admin);
		users_in_room[current_room].splice(index, 1);

		io.to(current_room).emit("current_user_list", users_in_room[current_room]);

		rooms.push(addedroom);
		room_pwd_map[addedroom] = roompwd;
		room_admin_map[addedroom] = admin;
		room_user_map[admin] = addedroom;
		users_in_room[addedroom] = [];
		users_in_room[addedroom].push(admin);
		users_in_room[socket.room]

		user_socket_map[admin].leave(socket.room);
		user_socket_map[admin].join(addedroom);
		user_socket_map[admin].room = addedroom;
		socket.emit("current_room", addedroom);
		console.log("new room " + addedroom + " was created by " + admin + " and pwd is " + roompwd);
		io.to(current_room).emit("announcement", "ADMIN: " + admin + " has left " + current_room);
		io.to(addedroom).emit("current_user_list", users_in_room[addedroom]);
		io.to(addedroom).emit("announcement", "ADMIN: " + admin + " has entered " + addedroom);

		for(i = 0; i < rooms.length; i++){
			io.to(rooms[i]).emit('updateRoom', rooms);
		}
	});


	socket.on('message_to_server', function(sender, data) {
		// This callback runs when the server receives a new message from the client.

		console.log(sender + " : "+data["message"]); // log it to the Node.JS output
		io.to(room_user_map[sender]).emit("message_to_client",sender, {message:data["message"] }) // broadcast the message to other users
	});

	socket.on('private_message', function(data){
		if(room_user_map[data.recipient] === room_user_map[data.sender]){
			console.log("Private Message From " + data.sender + " to " + data.recipient + " : " + data.private_msg);
			io.to(room_user_map[data.recipient]).emit('private_message', data.sender, data.recipient, data.private_msg);
		}else{
			return;
		}
	});

	socket.on('clear_room', function(username){
		socket.emit("clear_chat_history");
	});

	socket.on('kick_target', function(admin, kick_target, current_room){
		if (admin != room_admin_map[socket.room]){
			socket.emit("error_msg", "You are not the admin of this room");
			return;
		}
		if (users_in_room[socket.room].indexOf(kick_target) == -1){
			socket.emit("error_msg", "The user does not exist in this room");
			return;
		}

		var index = users_in_room[current_room].indexOf(kick_target);
		if(index != -1){
			users_in_room[current_room].splice(index, 1);
		};
		users_in_room["publicRoom"].push(kick_target);
		room_user_map[kick_target] = "publicRoom";
		user_socket_map[kick_target].leave(current_room);
		user_socket_map[kick_target].join("publicRoom");
		io.to("publicRoom").emit("current_user_list", users_in_room["publicRoom"]);
		user_socket_map[kick_target].emit("current_room", "publicRoom");
		io.to("publicRoom").emit("announcement", "ADMIN: " + kick_target + " has joined publicRoom");
		io.to(current_room).emit("current_user_list", users_in_room[current_room]);
		io.to(current_room).emit("announcement", "ADMIN: " + kick_target + " has been kicked from this room");
		console.log(kick_target + " is kicked from " +  current_room);
	});


	socket.on('ban_target', function(admin, ban_target, current_room){
		if (admin != room_admin_map[socket.room]){
			socket.emit("error_msg", "You are not the admin of this room");
			return;
		}
		if (users_in_room[socket.room].indexOf(ban_target) == -1){
			socket.emit("error_msg", "The user does not exist in this room");
			return;
		}

		var index = users_in_room[current_room].indexOf(ban_target);
		if(index != -1){
			users_in_room[current_room].splice(index, 1);
		};
		users_in_room["publicRoom"].push(ban_target);
		room_user_map[ban_target] = "publicRoom";
		room_ban_map[current_room] = ban_target;
		user_socket_map[ban_target].leave(current_room);
		user_socket_map[ban_target].join("publicRoom");
		io.to("publicRoom").emit("current_user_list", users_in_room["publicRoom"]);
		user_socket_map[ban_target].emit("current_room", "publicRoom");
		io.to("publicRoom").emit("announcement", "ADMIN: " + ban_target + " has joined publicRoom");
		io.to(current_room).emit("current_user_list", users_in_room[current_room]);
		io.to(current_room).emit("announcement", "ADMIN: " + ban_target + " has been BANNED from this room");
		console.log(ban_target + " is kicked from " +  current_room);
	});

});


