// const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Yes, TLS is required for WebRTC
const serverConfig = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

let url = '';

const server = https.createServer(serverConfig, (req, res) => {
    if (req.method === 'GET' && req.url === '/video') {
        const videoPath = './video/video.mp4';
        try {
            const videoSize = fs.statSync(videoPath).size;

            const range = req.headers.range;
            if (range) {
                const [start, end] = range.replace(/bytes=/, '').split('-');
                const startByte = parseInt(start, 10);
                const endByte = end ? parseInt(end, 10) : videoSize - 1;
                const chunkSize = endByte - startByte + 1;

                res.writeHead(206, {
                    'Content-Range': `bytes ${startByte}-${endByte}/${videoSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': 'video/mp4',
                });

                const videoStream = fs.createReadStream(videoPath, { start: startByte, end: endByte });
                videoStream.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': videoSize,
                    'Content-Type': 'video/mp4',
                });

                const videoStream = fs.createReadStream(videoPath);
                videoStream.pipe(res);
            }
        } catch (error) {
            res.statusCode = 400;
            res.end('Not found');
        }
    } else {
        res.statusCode = 200;
        res.end('Server running');
    }
});

const port = 3002;
const serverInstance = server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const wss = new WebSocket.Server({ server: serverInstance });

wss.on('connection', (ws) => {
    console.log('A client connected');

    if (url) {
        // Create a message object to send to clients
        const message = {
            action: 'setVideoUrl',
            videoUrl: url,
        };

        // Convert the message to JSON
        const messageJSON = JSON.stringify(message);

        // Send the message to the connected client
        ws.send(messageJSON);
    }

    // Handle incoming messages from clients
    ws.on('message', (message, isBinary) => {
        console.log(`Received message from client: ${message}`);

        // Parse the received message as JSON
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
        } catch (error) {
            parsedMessage = {};
        }

        // Check if the message has the required properties
        if (
            parsedMessage.action === 'setVideoUrl' &&
            parsedMessage.videoUrl !== null &&
            typeof parsedMessage.videoUrl === 'string'
        ) {
            // Set the video URL
            url = parsedMessage.videoUrl;

            // Broadcast the message with additional keys to all connected clients
            const broadcastMessage = JSON.stringify({
                ...parsedMessage,
                action: parsedMessage.action,
                videoUrl: parsedMessage.videoUrl,
            });

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastMessage, { binary: isBinary });
                }
            });
        } else {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message, { binary: isBinary });
                }
            });
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('A client disconnected');
    });
});
