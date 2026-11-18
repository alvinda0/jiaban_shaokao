const WebSocket = require('ws');
const url = require('url');

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map to store client info: { ws, store_id, user_id }
  }

  // Initialize WebSocket server
  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/orders'
    });

    this.wss.on('connection', (ws, req) => {
      const parameters = url.parse(req.url, true);
      const query = parameters.query;
      
      // Extract store_id and optional user_id from query params
      const store_id = query.store_id;
      const user_id = query.user_id || null;
      
      if (!store_id) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'store_id is required in query params'
        }));
        ws.close();
        return;
      }

      // Store client info
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        store_id,
        user_id,
        connected_at: new Date(),
      });

      console.log(`✅ WebSocket client connected: ${clientId} (Store: ${store_id}, User: ${user_id || 'anonymous'})`);
      console.log(`📊 Total connected clients: ${this.clients.size}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to order updates',
        client_id: clientId,
        store_id,
      }));

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON format'
          }));
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`❌ WebSocket client disconnected: ${clientId}`);
        console.log(`📊 Total connected clients: ${this.clients.size}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on('close', () => {
        clearInterval(pingInterval);
      });
    });

    console.log('🚀 WebSocket server initialized on path: /ws/orders');
    return this.wss;
  }

  // Generate unique client ID
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Handle incoming messages from clients
  handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`📨 Message from ${clientId}:`, data);

    switch (data.type) {
      case 'ping':
        client.ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'subscribe':
        // Client can subscribe to specific order or table
        // Future implementation: add subscription filters
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          message: 'Subscription updated',
          filters: data.filters || {}
        }));
        break;

      default:
        client.ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${data.type}`
        }));
    }
  }

  // Broadcast message to all connected clients
  broadcast(data) {
    if (!this.wss) {
      console.warn('⚠️ WebSocket server not initialized');
      return;
    }

    const message = JSON.stringify(data);
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Filter by store_id if data includes store_id
        if (data.store_id && client.store_id !== data.store_id) {
          return; // Skip clients from different stores
        }

        try {
          client.ws.send(message);
          sentCount++;
        } catch (error) {
          console.error(`❌ Error sending to client ${clientId}:`, error);
        }
      }
    });

    console.log(`📡 Broadcast sent to ${sentCount} clients (Type: ${data.type})`);
  }

  // Send message to specific store
  broadcastToStore(store_id, data) {
    if (!this.wss) {
      console.warn('⚠️ WebSocket server not initialized');
      return;
    }

    const message = JSON.stringify({ ...data, store_id });
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN && client.store_id === store_id) {
        try {
          client.ws.send(message);
          sentCount++;
        } catch (error) {
          console.error(`❌ Error sending to client ${clientId}:`, error);
        }
      }
    });

    console.log(`📡 Broadcast to store ${store_id} sent to ${sentCount} clients`);
  }

  // Send message to specific user
  sendToUser(user_id, data) {
    if (!this.wss) {
      console.warn('⚠️ WebSocket server not initialized');
      return;
    }

    const message = JSON.stringify(data);
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN && client.user_id === user_id) {
        try {
          client.ws.send(message);
          sentCount++;
        } catch (error) {
          console.error(`❌ Error sending to client ${clientId}:`, error);
        }
      }
    });

    console.log(`📧 Message sent to user ${user_id} (${sentCount} connections)`);
  }

  // Get connected clients count
  getClientsCount() {
    return this.clients.size;
  }

  // Get clients by store
  getClientsByStore(store_id) {
    const storeClients = [];
    this.clients.forEach((client, clientId) => {
      if (client.store_id === store_id) {
        storeClients.push({
          client_id: clientId,
          user_id: client.user_id,
          connected_at: client.connected_at,
        });
      }
    });
    return storeClients;
  }

  // Close all connections
  closeAll() {
    if (!this.wss) return;

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    });

    this.clients.clear();
    console.log('🔌 All WebSocket connections closed');
  }
}

// Export singleton instance
module.exports = new WebSocketServer();
