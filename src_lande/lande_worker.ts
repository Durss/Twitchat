import lande from 'lande';

// Listen for messages from the main thread
self.onmessage = function(event) {
    const result = lande(event.data.text ?? "");
    postMessage({id:event.data.id, result});
};