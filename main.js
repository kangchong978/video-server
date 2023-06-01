const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/video') {
        const videoPath = './video/video.mp4';
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
    } else {
        res.statusCode = 404;
        res.end('Not found');
    }
});


const port = 3002;
const serverInstance = server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const wss = new WebSocket.Server({ server: serverInstance });

wss.on('connection', (ws) => {
    console.log('A client connected');

    // Handle incoming messages from clients
    ws.on('message', (message, isBinary) => {
        console.log(`Received message from client: ${message}`);

        // Broadcast the message to all connected clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message, { binary: isBinary });
            }
        });
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('A client disconnected');
    });
});