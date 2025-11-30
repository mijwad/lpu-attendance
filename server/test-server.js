const net = require('net');
const server = net.createServer(socket => {
  socket.end('hello');
});
server.listen(3000, () => {
  console.log('raw TCP server listening on', server.address());
});
server.on('error', err => console.error('server error', err));
