let timeoutIdsToCallback = {};

// Function to start the timeout
function startTimeout(timeout, id) {
    const timeoutId = setTimeout(() => {
        postMessage({ type: "timeoutMessage", data: id });
    }, timeout);

    timeoutIdsToCallback[id] = timeoutId;
}

// Function to stop the timeout
function stopTimeout(id) {
    clearTimeout(timeoutIdsToCallback[id]);
	delete timeoutIdsToCallback[id];
}

// Listen for messages from the main thread
self.onmessage = function(event) {
    const data = event.data;

    // Determine the command
    switch (data.command) {
        case "startTimeout":
            startTimeout(data.timeout, data.id);
            break;
        case "stopTimeout":
            stopTimeout(data.id);
            break;
        default:
            console.error("Unknown command");
    }
};
