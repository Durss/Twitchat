const statik = require('node-static');

const fileServer = new statik.Server('./dist');

require('http').createServer(function (request, response) {
	request.addListener('end', function () {
		fileServer.serve(request, response, function (err, result) {
			if (err) { // There was an error serving the file
				console.error(
					"Error serving " + request.url + " - " + err.message
				);
                fileServer.serveFile(
                    '/index.html', 200, {}, request, response
                );

				// Respond to the client
				// response.writeHead(err.status, err.headers);
				// response.end();
			}
		});
	}).resume();
}).listen(3018);