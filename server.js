const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static('./'));

// Health check endpoint
app.get('/', (req, res) => {
    console.log('Health check endpoint called');
    res.json({ status: 'ok', message: 'Server is running' });
});

// API Endpoints
app.get('/reset', (req, res) => {
    console.log('Reset endpoint called');
    timerState.timeLeft = 72 * 60 * 60;
    timerState.lastUpdate = Date.now();
    io.emit('timerReset');
    io.emit('timerUpdate', {
        timeLeft: timerState.timeLeft,
        timestamp: Date.now()
    });
    console.log('Timer reset to:', timerState.timeLeft, 'seconds');
    res.json({ success: true, message: 'Timer reset successfully' });
});

app.get('/status', (req, res) => {
    console.log('Status endpoint called');
    const currentTime = Date.now();
    const response = {
        timeLeft: timerState.timeLeft,
        timestamp: currentTime,
        endTime: currentTime + (timerState.timeLeft * 1000),
        unit: 'seconds'
    };
    console.log('Status response:', response);
    res.json(response);
});

// Store the current timer state
let timerState = {
    timeLeft: 72 * 60 * 60, // 72 hours in seconds
    lastUpdate: Date.now()
};

// Update timer every 10ms for smoother display
setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - timerState.lastUpdate) / 1000; // Convert to seconds
    timerState.timeLeft = Math.max(0, timerState.timeLeft - deltaTime);
    timerState.lastUpdate = now;
    
    // Broadcast current time to all clients
    io.emit('timerUpdate', {
        timeLeft: timerState.timeLeft,
        timestamp: now
    });
}, 10);

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Send current timer state to new client
    socket.emit('timerUpdate', {
        timeLeft: timerState.timeLeft,
        timestamp: Date.now()
    });
    
    // Handle timer reset
    socket.on('resetTimer', (data) => {
        timerState.timeLeft = data.defaultTime || 72 * 60 * 60;
        timerState.lastUpdate = Date.now();
        io.emit('timerReset');
        io.emit('timerUpdate', {
            timeLeft: timerState.timeLeft,
            timestamp: Date.now()
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

http.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 