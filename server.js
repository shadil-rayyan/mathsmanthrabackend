const io = require("socket.io")(3000, {
    cors: { origin: "*" }
});

let rooms = {}; // Store active rooms and game state
const questions = [
    { question: "What is 3 + 2?", answer: 5 },
    { question: "What is 7 + 8?", answer: 15 },
    { question: "What is 12 - 5?", answer: 7 },
    { question: "What is 9 × 3?", answer: 27 },
    { question: "What is 16 ÷ 4?", answer: 4 }
];

io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);

    // Create Room
    socket.on("create_room", () => {
        let roomNumber = Math.floor(1000 + Math.random() * 9000);
        rooms[roomNumber] = { players: [socket.id], gameStarted: false, currentQuestion: null };
        socket.join(roomNumber);
        console.log(`🏠 Room created: ${roomNumber}`);
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
            sendNewQuestion(roomNumber);
            io.to(roomNumber).emit("game_started");
        } else {
            socket.emit("error", "Not enough players to start the game");
        }
    });

    // Send new question
    function sendNewQuestion(roomNumber) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        const questionData = questions[randomIndex];

        rooms[roomNumber].currentQuestion = questionData;
        io.to(roomNumber).emit("new_question", questionData);
    }

    // Handle answer submission
    socket.on("submit_answer", (data) => {
        const { roomNumber, playerAnswer } = data;
        roomNumber = parseInt(roomNumber);

        if (!rooms[roomNumber] || !rooms[roomNumber].currentQuestion) return;

        const correctAnswer = rooms[roomNumber].currentQuestion.answer;
        const isCorrect = playerAnswer === correctAnswer;

        io.to(roomNumber).emit("answer_result", { player: socket.id, correct: isCorrect });

        // Send next question after 2 seconds
        setTimeout(() => sendNewQuestion(roomNumber), 2000);
    });

    // Handle Disconnection
    socket.on("disconnect", () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
        for (let roomNumber in rooms) {
            rooms[roomNumber].players = rooms[roomNumber].players.filter(id => id !== socket.id);
            if (rooms[roomNumber].players.length === 0) {
                delete rooms[roomNumber]; // Remove empty room
            }
        }
    });
});
