require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const websocketServer = require('./src/config/websocket');

const port = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Initialize WebSocket server
  const wss = websocketServer.initialize(server);
  
  // Make WebSocket server globally available for broadcasting
  global.wss = websocketServer;
  
  // Start server
  server.listen(port, () => {
    console.log(`🚀 HTTP Server running on port ${port}`);
    console.log(`🔌 WebSocket Server available at ws://localhost:${port}/ws/orders`);
    console.log(`📡 Connect with: ws://localhost:${port}/ws/orders?store_id=YOUR_STORE_ID`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    websocketServer.closeAll();
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
};

start();
