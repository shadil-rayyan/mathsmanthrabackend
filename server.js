const io = require("socket.io")(3000, {
    cors: { origin: "*" }
});

let rooms = {}; // Stores room details
const questions = [
    { question: "What is 3 + 2?", answer: 5 },
    { question: "What is 7 + 8?", answer: 15 },
    { question: "What is 12 - 5?", answer: 7 },
    { question: "What is 9 × 3?", answer: 27 },
    { question: "What is 16 ÷ 4?", answer: 4 }
];

io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);

    // ✅ Create Room
    socket.on("create_room", () => {
        let roomNumber = Math.floor(1000 + Math.random() * 9000);
        rooms[roomNumber] = { players: [socket.id], gameStarted: false, currentQuestion: null };

        socket.join(roomNumber);
        console.log(`✅ Room ${roomNumber} created by ${socket.id}`);
        
        socket.emit("room_created", roomNumber.toString()); // Send as string to avoid parsing issues
    });

    // ✅ Join Room
    socket.on("join_room", (roomNumber) => {
        roomNumber = parseInt(roomNumber);

        // Ensure room exists and game has not started
        if (!rooms[roomNumber]) {
            socket.emit("error", "Room not found");
            return;
        }
        if (rooms[roomNumber].gameStarted) {
            socket.emit("error", "Game already started");
            return;
        }

        // Leave all previous rooms
        socket.rooms.forEach((room) => {
            if (room !== socket.id) socket.leave(room);
        });

        // Add player to room
        rooms[roomNumber].players.push(socket.id);
        socket.join(roomNumber);
        console.log(`👤 Player ${socket.id} joined Room ${roomNumber}`);

        io.to(roomNumber).emit("player_joined", rooms[roomNumber].players);
    });

    // ✅ Start Game
    socket.on("start_game", (roomNumber) => {
        roomNumber = parseInt(roomNumber);

        if (!rooms[roomNumber]) {
            socket.emit("error", "Room does not exist");
            return;
        }
        if (rooms[roomNumber].gameStarted) {
            socket.emit("error", "Game has already started");
            return;
        }

        rooms[roomNumber].gameStarted = true;
        console.log(`🎮 Game started in Room ${roomNumber}`);

        io.to(roomNumber).emit("game_started", "Game has started!");
    });

    // ✅ Handle Disconnections
    socket.on("disconnect", () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
        
        for (const room in rooms) {
            rooms[room].players = rooms[room].players.filter(id => id !== socket.id);
            if (rooms[room].players.length === 0) {
                console.log(`🗑️ Deleting empty Room ${room}`);
                delete rooms[room];
            }
        }
    });
});
