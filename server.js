const io = require("socket.io")(3000, {
    cors: { origin: "*" }
});

let rooms = {}; // Store active rooms with players

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Create Room
    socket.on("create_room", () => {
        let roomNumber = Math.floor(1000 + Math.random() * 9000);
        rooms[roomNumber] = { players: [socket.id], gameStarted: false };
        socket.join(roomNumber);
        console.log(`Room created: ${roomNumber}`);
        socket.emit("room_created", roomNumber);
    });

    // Join Room
    socket.on("join_room", (roomNumber) => {
        roomNumber = parseInt(roomNumber);
        if (rooms[roomNumber] && !rooms[roomNumber].gameStarted) {
            rooms[roomNumber].players.push(socket.id);
            socket.join(roomNumber);
            io.to(roomNumber).emit("player_joined", rooms[roomNumber].players);
        } else {
            socket.emit("error", "Room not found or game already started");
        }
    });

    // Start Game (Only Host)
    socket.on("start_game", (roomNumber) => {
        roomNumber = parseInt(roomNumber);
        if (rooms[roomNumber] && rooms[roomNumber].players.length > 1) {
            rooms[roomNumber].gameStarted = true;
            let randomPlayer = rooms[roomNumber].players[Math.floor(Math.random() * rooms[roomNumber].players.length)];
            io.to(roomNumber).emit("game_started", { randomPlayer });
        } else {
            socket.emit("error", "Not enough players to start the game");
        }
    });

    // Handle Disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        for (let roomNumber in rooms) {
            rooms[roomNumber].players = rooms[roomNumber].players.filter(id => id !== socket.id);
            if (rooms[roomNumber].players.length === 0) {
                delete rooms[roomNumber]; // Remove empty room
            }
        }
    });
});
