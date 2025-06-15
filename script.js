let countdown;
let hideTimeout;
let cursorTimeout;
let timeLeft = parseTimeToSeconds("72:00:00"); // Initialize with default time
let lastUpdate = Date.now();
let isOnline = false;
let socket;
const timerDisplay = document.getElementById('timer');
const startButton = document.getElementById('startButton');
const timerColorInput = document.getElementById('timerColor');
const buttonColorInput = document.getElementById('buttonColor');
const buttonTextInput = document.getElementById('buttonText');
const timeFormatInput = document.getElementById('timeFormat');
const defaultTimeInput = document.getElementById('defaultTime');
const controls = document.getElementById('controls');
const settingsIcon = document.getElementById('settingsIcon');
const colorControls = document.getElementById('colorControls');

// Parse time string to seconds
function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(/[:.-]/);
    let totalSeconds = 0;
    
    if (parts.length === 3) {
        // HH:MM:SS or MM:SS:ss format
        totalSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 4) {
        // MM-DD HH:MM format
        const [month, day, hour, minute] = parts;
        const date = new Date();
        date.setMonth(parseInt(month) - 1);
        date.setDate(parseInt(day));
        date.setHours(parseInt(hour));
        date.setMinutes(parseInt(minute));
        date.setSeconds(0);
        totalSeconds = Math.floor((date - new Date()) / 1000);
    }
    
    return totalSeconds;
}

// Format seconds according to the user's format
function formatTime(seconds) {
    const format = timeFormatInput.value;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    if (format === 'HH:MM:SS') {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else if (format === 'MM:SS:ss') {
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(Math.floor((seconds % 1) * 100)).padStart(2, '0')}`;
    } else if (format === 'MM-DD HH:MM') {
        const date = new Date();
        date.setSeconds(date.getSeconds() + seconds);
        return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (format === 'HH:MM:SS.mmm') {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }
    
    // Default to HH:MM:SS if format is invalid
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Load saved settings from localStorage
function loadSettings() {
    const savedTimerColor = localStorage.getItem('timerColor');
    const savedButtonColor = localStorage.getItem('buttonColor');
    const savedButtonText = localStorage.getItem('buttonText');
    const savedTimeFormat = localStorage.getItem('timeFormat');
    const savedDefaultTime = localStorage.getItem('defaultTime');

    if (savedTimerColor) {
        timerColorInput.value = savedTimerColor;
        timerDisplay.style.setProperty('color', savedTimerColor);
        timerDisplay.style.setProperty('text-shadow', `0 0 20px ${savedTimerColor}80`);
    }

    if (savedButtonColor) {
        buttonColorInput.value = savedButtonColor;
        startButton.style.backgroundColor = savedButtonColor;
        startButton.style.boxShadow = `0 0 20px ${savedButtonColor}80`;
    }

    if (savedButtonText) {
        buttonTextInput.value = savedButtonText;
        startButton.textContent = savedButtonText;
    }

    if (savedTimeFormat) {
        timeFormatInput.value = savedTimeFormat;
    }

    if (savedDefaultTime) {
        defaultTimeInput.value = savedDefaultTime;
        timeLeft = parseTimeToSeconds(savedDefaultTime);
    }

    // Update display with current settings
    updateDisplay();
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('timerColor', timerColorInput.value);
    localStorage.setItem('buttonColor', buttonColorInput.value);
    localStorage.setItem('buttonText', buttonTextInput.value);
    localStorage.setItem('timeFormat', timeFormatInput.value);
    localStorage.setItem('defaultTime', defaultTimeInput.value);
}

// Load settings when page loads
loadSettings();

// Function to connect to WebSocket server
function connectToServer() {
    if (socket) {
        socket.disconnect();
    }

    socket = io(window.location.origin);

    socket.on('connect', () => {
        console.log('Connected to server');
        isOnline = true;
        updateDisplay(); // Update display when connecting
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        isOnline = false;
        updateDisplay(); // Update display when disconnecting
    });

    socket.on('timerUpdate', (data) => {
        timeLeft = data.timeLeft;
        updateDisplay();
    });

    socket.on('timerReset', () => {
        timeLeft = parseTimeToSeconds(defaultTimeInput.value);
        updateDisplay();
    });
}

// Function to enter fullscreen
function enterFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { // Safari
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE11
        element.msRequestFullscreen();
    }
}

// Function to exit fullscreen
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { // Safari
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE11
        document.msExitFullscreen();
    }
}

// Check if we're in fullscreen
function isFullscreen() {
    return document.fullscreenElement || 
           document.webkitFullscreenElement || 
           document.msFullscreenElement;
}

// Set initial colors
timerDisplay.style.setProperty('color', timerColorInput.value);
startButton.style.backgroundColor = buttonColorInput.value;

// Function to show controls and cursor
function showControls() {
    controls.classList.add('visible');
    settingsIcon.classList.add('visible');
    document.body.style.cursor = 'default';
    
    // Clear any existing timeout
    if (hideTimeout) {
        clearTimeout(hideTimeout);
    }
    
    // Set new timeout to hide controls
    hideTimeout = setTimeout(() => {
        controls.classList.remove('visible');
        settingsIcon.classList.remove('visible');
    }, 5000);

    // Clear cursor timeout and set new one
    if (cursorTimeout) {
        clearTimeout(cursorTimeout);
    }
    cursorTimeout = setTimeout(() => {
        document.body.style.cursor = 'none';
    }, 5000);
}

// Function to toggle color controls
function toggleColorControls() {
    colorControls.style.display = colorControls.style.display === 'none' ? 'flex' : 'none';
}

// Add mouse movement event listener
document.addEventListener('mousemove', () => {
    document.body.style.cursor = 'default';
    if (cursorTimeout) {
        clearTimeout(cursorTimeout);
    }
    cursorTimeout = setTimeout(() => {
        document.body.style.cursor = 'none';
    }, 5000);
});

// Add click event listener to the document
document.addEventListener('click', () => {
    showControls();
});

// Add click event listener to the settings icon
settingsIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleColorControls();
});

// Add color change event listeners
timerColorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    timerDisplay.style.setProperty('color', color);
    timerDisplay.style.setProperty('text-shadow', `0 0 20px ${color}80`);
    localStorage.setItem('timerColor', color);
    showControls();
});

buttonColorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    startButton.style.backgroundColor = color;
    startButton.style.boxShadow = `0 0 20px ${color}80`;
    localStorage.setItem('buttonColor', color);
    showControls();
});

buttonTextInput.addEventListener('input', (e) => {
    startButton.textContent = e.target.value;
    localStorage.setItem('buttonText', e.target.value);
    showControls();
});

function updateDisplay() {
    // Remove any existing flash classes
    timerDisplay.classList.remove('slow-flash', 'fast-flash');
    
    if (timeLeft <= 0) {
        // Show timer end image
        timerDisplay.innerHTML = `<img src="/icons/timer-end.png" alt="Timer End" class="timer-end-image">`;
    } else {
        // Show normal timer
        timerDisplay.textContent = formatTime(timeLeft);
        
        // Add flashing effects based on remaining time
        if (timeLeft <= 8 * 60 * 60) { // 8 hours or less
            timerDisplay.classList.add('fast-flash');
        } else if (timeLeft <= 24 * 60 * 60) { // 24 hours or less
            timerDisplay.classList.add('slow-flash');
        }
    }
    resizeTimer();
}

// Add function to handle timer end state
function handleTimerEnd() {
    if (timeLeft <= 0) {
        timerDisplay.innerHTML = `<img src="/icons/timer-end.png" alt="Timer End" class="timer-end-image">`;
    }
}

function updateTimer() {
    const now = Date.now();
    const deltaTime = (now - lastUpdate) / 1000; // Convert to seconds
    lastUpdate = now;

    if (!isOnline) {
        // Decrease time only when offline
        timeLeft = Math.max(0, timeLeft - deltaTime);
        
        // If time reaches zero, reset to default time
        if (timeLeft <= 0) {
            timeLeft = parseTimeToSeconds(defaultTimeInput.value);
        }
    }
    
    requestAnimationFrame(updateDisplay);
}

// Start the timer immediately with higher precision
setInterval(updateTimer, 10); // Update every 10ms for smoother display

// Function to reset timer
function resetTimer() {
    if (isOnline) {
        socket.emit('resetTimer', { defaultTime: parseTimeToSeconds(defaultTimeInput.value) });
    } else {
        timeLeft = parseTimeToSeconds(defaultTimeInput.value);
        updateDisplay();
    }
    showControls();
}

// Add click event listener to the button
startButton.addEventListener('click', resetTimer);

// Enter fullscreen when the app starts
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure the app is fully loaded
    setTimeout(() => {
        enterFullscreen();
    }, 1000);
    
    // Connect to server
    connectToServer();
});

// Handle fullscreen changes
document.addEventListener('fullscreenchange', () => {
    if (!isFullscreen()) {
        enterFullscreen();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    connectToServer();
});

window.addEventListener('offline', () => {
    isOnline = false;
});

// Show controls initially
showControls();

// Add event listeners for new inputs
timeFormatInput.addEventListener('input', (e) => {
    localStorage.setItem('timeFormat', e.target.value);
    updateDisplay();
    showControls();
});

defaultTimeInput.addEventListener('input', (e) => {
    const newDefaultTime = e.target.value;
    localStorage.setItem('defaultTime', newDefaultTime);
    // Update current time if it's at the default value
    if (timeLeft === parseTimeToSeconds(defaultTimeInput.value)) {
        timeLeft = parseTimeToSeconds(newDefaultTime);
        updateDisplay();
    }
    showControls();
});

// Initialize the display with the current format
updateDisplay();

function resizeTimer() {
    const timer = document.getElementById('timer');
    const container = timer.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Start with the base font size
    let fontSize = 20;
    timer.style.fontSize = `${fontSize}vw`;
    
    // Get the timer's dimensions
    let timerWidth = timer.offsetWidth;
    let timerHeight = timer.offsetHeight;
    
    // Calculate the scale needed to fit within the container
    const widthScale = (containerWidth * 0.9) / timerWidth;
    const heightScale = (containerHeight * 0.9) / timerHeight;
    const scale = Math.min(widthScale, heightScale);
    
    // Apply the scale transform
    timer.style.transform = `scale(${scale})`;
}

// Call resizeTimer when the window is resized
window.addEventListener('resize', resizeTimer);

// Call resizeTimer after each timer update
const originalUpdateDisplay = updateDisplay;
updateDisplay = function() {
    originalUpdateDisplay();
    resizeTimer();
};

// Initial resize
resizeTimer(); 