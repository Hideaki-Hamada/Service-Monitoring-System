
onst http = require('http');

const asciiCat = `
  /\\_/\\
 ( o.o )
  > ^ <
`;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(asciiCat);
});

const port = 3000;
const hostname = '127.0.0.1';

server.listen(port, hostname, () => {
    console.log(Server running at http://${hostname}:${port}/);
});
