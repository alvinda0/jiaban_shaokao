import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketMessage } from '@/types/order';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: any) => void;
  close: () => void;
  reconnect: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const shouldReconnectRef = useRef(reconnect);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Clear ping interval
  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Send ping to keep connection alive
  const startPingInterval = useCallback(() => {
    clearPingInterval();
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }, [clearPingInterval]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log('🔌 Connecting to WebSocket:', url);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;
        startPingInterval();
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message);
          onMessage?.(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('❌ WebSocket closed');
        setIsConnected(false);
        clearPingInterval();
        wsRef.current = null;
        onClose?.();

        // Attempt to reconnect
        if (shouldReconnectRef.current && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(
            `🔄 Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`
          );
          clearReconnectTimeout();
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          console.error('❌ Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
    }
  }, [
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval,
    reconnectAttempts,
    clearPingInterval,
    clearReconnectTimeout,
    startPingInterval,
  ]);

  // Send message
  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('⚠️ WebSocket is not connected');
    }
  }, []);

  // Close connection
  const close = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    clearPingInterval();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [clearReconnectTimeout, clearPingInterval]);

  // Reconnect manually
  const reconnectManually = useCallback(() => {
    shouldReconnectRef.current = true;
    reconnectCountRef.current = 0;
    close();
    connect();
  }, [close, connect]);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      clearPingInterval();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearReconnectTimeout, clearPingInterval]);

  return {
    isConnected,
    send,
    close,
    reconnect: reconnectManually,
  };
};

// Hook for order-specific WebSocket
interface UseOrderWebSocketOptions {
  storeId: string;
  userId?: string;
  onOrderCreated?: (order: any) => void;
  onOrderUpdated?: (order: any) => void;
  onOrderDeleted?: (data: any) => void;
  onOrderItemAdded?: (data: any) => void;
  onOrderItemUpdated?: (data: any) => void;
  onOrderPaymentAdded?: (data: any) => void;
  onMessage?: (message: WebSocketMessage) => void;
  enabled?: boolean;
}

export const useOrderWebSocket = (options: UseOrderWebSocketOptions) => {
  const {
    storeId,
    userId,
    onOrderCreated,
    onOrderUpdated,
    onOrderDeleted,
    onOrderItemAdded,
    onOrderItemUpdated,
    onOrderPaymentAdded,
    onMessage,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Build WebSocket URL
  const wsUrl = (() => {
    if (!enabled) return '';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const url = baseUrl.replace('http', 'ws');
    const params = new URLSearchParams({ store_id: storeId });
    if (userId) {
      params.append('user_id', userId);
    }
    return `${url}/ws/orders?${params.toString()}`;
  })();

  // Handle WebSocket messages
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      // Call custom handler if provided
      onMessage?.(message);

      // Handle specific event types
      switch (message.type) {
        case 'order_created':
          onOrderCreated?.(message.data);
          break;
        case 'order_updated':
          onOrderUpdated?.(message.data);
          break;
        case 'order_deleted':
          onOrderDeleted?.(message.data);
          break;
        case 'order_item_added':
          onOrderItemAdded?.(message.data);
          break;
        case 'order_item_updated':
          onOrderItemUpdated?.(message.data);
          break;
        case 'order_payment_added':
          onOrderPaymentAdded?.(message.data);
          break;
        case 'connection':
          console.log('🔌 Connected to order updates:', message.message);
          break;
        case 'error':
          console.error('❌ WebSocket error:', message.message);
          break;
      }
    },
    [
      onMessage,
      onOrderCreated,
      onOrderUpdated,
      onOrderDeleted,
      onOrderItemAdded,
      onOrderItemUpdated,
      onOrderPaymentAdded,
    ]
  );

  const ws = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onOpen: () => {
      setConnectionStatus('connected');
      console.log('✅ Order WebSocket connected');
    },
    onClose: () => {
      setConnectionStatus('disconnected');
      console.log('❌ Order WebSocket disconnected');
    },
    onError: (error) => {
      console.error('❌ Order WebSocket error:', error);
    },
    reconnect: enabled,
    reconnectInterval: 3000,
    reconnectAttempts: 5,
  });

  // Update connecting status
  useEffect(() => {
    if (enabled && !ws.isConnected && connectionStatus === 'disconnected') {
      setConnectionStatus('connecting');
    }
  }, [enabled, ws.isConnected, connectionStatus]);

  return {
    isConnected: ws.isConnected,
    connectionStatus,
    send: ws.send,
    close: ws.close,
    reconnect: ws.reconnect,
  };
};
