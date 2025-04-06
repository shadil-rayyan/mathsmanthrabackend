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
const MAX_QUESTIONS = 5;

io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);

    // Create Room
    socket.on("create_room", (playerName) => {
        const roomNumber = Math.floor(1000 + Math.random() * 9000);
        rooms[roomNumber] = {
            players: [socket.id],
            playerNames: { [socket.id]: playerName },
            gameStarted: false,
            currentQuestion: null,
            playerStats: {},
            questionCount: 0
        };
        rooms[roomNumber].playerStats[socket.id] = {
            correct: 0,
            wrong: 0,
            responseTimes: []
        };
        socket.join(roomNumber);
        socket.emit("room_created", roomNumber);
    });

    // Join Room
    socket.on("join_room", (data) => {
        const { roomNumber, playerName } = data;
        const room = rooms[roomNumber];
        if (room && !room.gameStarted) {
            room.players.push(socket.id);
            room.playerNames[socket.id] = playerName;
            room.playerStats[socket.id] = {
                correct: 0,
                wrong: 0,
                responseTimes: []
            };
            socket.join(roomNumber);
            io.to(roomNumber).emit("player_joined", Object.values(room.playerNames));
        } else {
            socket.emit("error", "Room not found or game already started");
        }
    });

    // Start Game
    socket.on("start_game", (roomNumber) => {
        const room = rooms[roomNumber];
        if (room && room.players.length > 1) {
            room.gameStarted = true;
            room.questionCount = 0;
            sendNewQuestion(roomNumber);
            io.to(roomNumber).emit("game_started");
        }
    });

    function sendNewQuestion(roomNumber) {
        const room = rooms[roomNumber];
        if (room.questionCount >= MAX_QUESTIONS) {
            endGame(roomNumber);
            return;
        }

        const questionData = questions[Math.floor(Math.random() * questions.length)];
        room.currentQuestion = {
            ...questionData,
            startTime: Date.now(),
            answeredPlayers: []
        };
        room.questionCount++;
        
        io.to(roomNumber).emit("new_question", {
            question: questionData.question,
            questionCount: room.questionCount
        });
    }

    socket.on("submit_answer", (data) => {
        const { roomNumber, answer } = data;
        const room = rooms[roomNumber];
        if (!room || !room.currentQuestion) return;

        const playerStats = room.playerStats[socket.id];
        const responseTime = (Date.now() - room.currentQuestion.startTime) / 1000;
        const isCorrect = answer === room.currentQuestion.answer;

        // Update stats
        if (isCorrect) {
            playerStats.correct++;
            playerStats.responseTimes.push(responseTime);
        } else {
            playerStats.wrong++;
        }

        // Track answered players
        room.currentQuestion.answeredPlayers.push(socket.id);

        // Notify player
        socket.emit("answer_result", isCorrect);

        // Check if all players answered
        if (room.currentQuestion.answeredPlayers.length === room.players.length) {
            setTimeout(() => sendNewQuestion(roomNumber), 2000);
        }
    });

    function endGame(roomNumber) {
        const room = rooms[roomNumber];
        const leaderboard = Object.entries(room.playerStats).map(([id, stats]) => ({
            name: room.playerNames[id],
            correct: stats.correct,
            wrong: stats.wrong,
            avgTime: stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length || 0
        })).sort((a, b) => b.correct - a.correct || a.avgTime - b.avgTime);

        io.to(roomNumber).emit("game_over", leaderboard);
        delete rooms[roomNumber];
    }

    socket.on("disconnect", () => {
        // Cleanup logic remains similar
    });
});
