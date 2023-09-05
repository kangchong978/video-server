const http = require('http');
const fs = require('fs');
const ngrok = require('ngrok');


const server = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/video' || req.url === '/')) {
        const videoPath = './video/video.mp4'; // Rename file
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
        res.end('only /video or root(/) path to access the video');
    }
});

const port = 3002;
server.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    const url = await ngrok.connect({
        proto: 'http', // http|tcp|tls, defaults to http
        addr: port, // port or network address, defaults to 80
        // basic_auth: 'kangchong978@gmail.com:421424wizard', // http basic authentication for tunnel
        // authtoken: 'ak_2UxVcZKgo88n8Cn6XSoUb98pR5K', // your authtoken from ngrok.com 
        binPath: path => path.replace('app.asar', 'app.asar.unpacked'), // custom binary path, eg for prod in electron
        onStatusChange: status => { }, // 'closed' - connection is lost, 'connected' - reconnected
        onLogEvent: data => { }, // returns stdout messages from ngrok process
    });
    console.log(url);

});


