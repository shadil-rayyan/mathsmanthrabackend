const io = require("socket.io")(3000, {
    cors: { origin: "*" }
});

let rooms = {};
const questions = [
    { question: "What is 3 + 2?", answer: 5 },
    { question: "What is 7 + 8?", answer: 15 },
    { question: "What is 12 - 5?", answer: 7 },
    { question: "What is 9 × 3?", answer: 27 },
    { question: "What is 16 ÷ 4?", answer: 4 }
];

io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);

    socket.on("create_room", () => {
        let roomNumber = Math.floor(1000 + Math.random() * 9000);
        rooms[roomNumber] = { players: [socket.id], gameStarted: false, currentQuestion: null };
        socket.join(roomNumber);
        socket.emit("room_created", { roomNumber });
    });

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

    socket.on("start_game", (roomNumber) => {
        roomNumber = parseInt(roomNumber);
        if (rooms[roomNumber] && rooms[roomNumber].players.length > 1) {
            rooms[roomNumber].gameStarted = true;
            sendNewQuestion(roomNumber);
            io.to(roomNumber).emit("game_started");
        } else {
            socket.emit("error", "At least two players required to start!");
        }
    });

    function sendNewQuestion(roomNumber) {
        if (!rooms[roomNumber]) return;
        const randomIndex = Math.floor(Math.random() * questions.length);
        const questionData = questions[randomIndex];

        rooms[roomNumber].currentQuestion = questionData;
        io.to(roomNumber).emit("new_question", questionData);
    }

    socket.on("submit_answer", (data) => {
        const { roomNumber, answer } = data;
        roomNumber = parseInt(roomNumber);

        if (!rooms[roomNumber] || !rooms[roomNumber].currentQuestion) return;

        const isCorrect = answer === rooms[roomNumber].currentQuestion.answer;
        io.to(roomNumber).emit("answer_result", { player: socket.id, correct: isCorrect });

        setTimeout(() => sendNewQuestion(roomNumber), 2000);
    });

    socket.on("disconnect", () => {
        Object.keys(rooms).forEach(roomNumber => {
            rooms[roomNumber].players = rooms[roomNumber].players.filter(id => id !== socket.id);
            if (!rooms[roomNumber].players.length) delete rooms[roomNumber];
        });
    });
});
