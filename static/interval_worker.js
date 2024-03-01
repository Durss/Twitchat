let intervalIdsToCallback = {};

// Function to start the interval
function startInterval(interval, id) {
    const intervalId = setInterval(() => {
        postMessage({ type: "intervalMessage", data: id });
    }, interval);
    
    intervalIdsToCallback[id] = intervalId;
}

// Function to stop the interval
function stopInterval(id) {
    clearInterval(intervalIdsToCallback[id]);
	delete intervalIdsToCallback[id];
}

// Listen for messages from the main thread
self.onmessage = function(event) {
    const data = event.data;
    
    // Determine the command
    switch (data.command) {
        case "startInterval":
            startInterval(data.interval, data.id);
            break;
        case "stopInterval":
            stopInterval(data.id);
            break;
        default:
            console.error("Unknown command");
    }
};