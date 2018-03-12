// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var fs = require('fs'); // required for file serving


server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

/*
 * Get number of users in a specific room
 */
function getNumberUsersInRoom(room) {
  var room = io.sockets.adapter.rooms[room];

  if (room !== undefined) {
    console.log('room length ' + room.length);
    return room.length;
  }
  else {
    return 0;
  }

}

/*
 * Get connected users in a specific room
 */
function getConnectedUsersInRoom(roomId) {

    var connedtedUsers = [];

    if(io.sockets.adapter.rooms[roomId] !== undefined) {
      var clients = io.sockets.adapter.rooms[roomId].sockets;

      for (var clientId in clients ) {

        var user = {};
        //this is the socket of each client in the room.
        var clientSocket = io.sockets.connected[clientId];

        if (clientSocket.username !== undefined && clientSocket.url_avatar != undefined) {
          user.username = clientSocket.username;
          user.url_avatar = clientSocket.url_avatar;
          connedtedUsers.push(user);
        }
      }
    }
    return connedtedUsers;
}

/*
 * List of current rooms with number of users
 */
function getRooms() {
  var availableRooms = [];
  var rooms = io.sockets.adapter.rooms;
  if (rooms) {
    for (var room in rooms) {
      if (!rooms[room].hasOwnProperty(room) && room.includes('room:')) {
        var data = {}
        data.roomName = room.split("room:").pop();
        data.numberOfUsers = rooms[room].length;
        availableRooms.push(data);
      }
    }
  }
  return availableRooms;
}

io.on('connection', function (socket) {
  console.log('on connection');

  io.to(socket.id).emit('list_room', getRooms());

  socket.on('add username', function(data) {
    console.log('add username :' + data);
    socket.username = data;
  });

  socket.on('add url_avatar', function(data) {
    console.log('add url_avatar :' + data);
    socket.url_avatar = data;
  });

  socket.on('joinRoom', function(roomId) {
    console.log('joinRoom:' + roomId);
    roomId = 'room:' + roomId;
    socket.join(roomId);
    socket.roomId = roomId;

    io.to(socket.id).emit('numberUsers', {numberOfUsers: getNumberUsersInRoom(roomId) - 1 });

    socket.broadcast.to(roomId).emit('joinRoom', {
      username: socket.username,
      numberOfUsers: getNumberUsersInRoom(roomId) - 1
    });

    socket.broadcast.to(roomId).emit('onConnectedUsers', getConnectedUsersInRoom(roomId));
    //TODO try to find another way to do it
    io.to(socket.id).emit('onConnectedUsers', getConnectedUsersInRoom(roomId));
    socket.broadcast.emit('list_room', getRooms());
  });

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function(data) {
    console.log('new message from room ' + socket.roomId);
    console.log('room :' + socket.roomId);

    console.log(getConnectedUsersInRoom(socket.roomId));

    if (socket.roomId !== undefined)
      socket.broadcast.to(socket.roomId).emit('new message', {
        audio: true,
        buffer: data.toString('base64'),
        username: socket.username,
        url_avatar: socket.url_avatar
      });
  });


  socket.on('leaveRoom', function(room) {
    socket.leave(room);

    getNumberUsersInRoom(room);
  });

  socket.on('list_room', function(room) {
    console.log('list room');


  });



  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
  //  var room = io.sockets.adapter.rooms[socket.roomId];
    //console.log(' room length ' + room.length);
    console.log('rooom dec '+ socket.roomId);

    if (socket.roomId !== undefined) {
      socket.leave(socket.roomId);

      socket.broadcast.to(socket.roomId).emit('leftRoom', {
        username: socket.username,
        numberOfUsers: getNumberUsersInRoom(socket.roomId) - 1
      });

      socket.broadcast.to(socket.roomId).emit('onConnectedUsers', getConnectedUsersInRoom(socket.roomId));

      socket.broadcast.emit('list_room', getRooms());
    }



    console.log('new message disco' +
        '');
 /*   if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }   */
  });
});
