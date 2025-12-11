// client/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { SOCKET_EVENTS, SOCKET_CONFIG } from '../utils/socketConstants';

const SocketContext = createContext();

// Custom hook
const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

// Provider component
const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [queueUpdates, setQueueUpdates] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    console.log('🔌 Initializing socket connection...');
    
    const newSocket = io(SOCKET_CONFIG.URL, {
      withCredentials: true,
      transports: SOCKET_CONFIG.TRANSPORTS,
      reconnection: true,
      reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
      autoConnect: true
    });

    // Connection events
    newSocket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on(SOCKET_EVENTS.CONNECTED, (data) => {
      console.log('✅ Server connection confirmed:', data.socketId);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      setSocket(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setIsConnected(false);
    });

    // Room management events
    newSocket.on(SOCKET_EVENTS.ROOM_JOINED, (data) => {
      console.log('✅ Joined room:', data.roomName);
    });

    newSocket.on(SOCKET_EVENTS.ROOM_LEFT, (data) => {
      console.log('✅ Left room:', data.roomName);
    });

    // Queue management events
    newSocket.on(SOCKET_EVENTS.QUEUE_UPDATED, (data) => {
      console.log('📊 Queue updated:', data);
      setQueueUpdates(prev => ({
        ...prev,
        [data.vendorId]: {
          ...data,
          receivedAt: Date.now(),
          type: 'queue-updated'
        }
      }));
    });

    newSocket.on(SOCKET_EVENTS.CUSTOMER_CALLED, (data) => {
      console.log('📢 Customer called:', data);
      setQueueUpdates(prev => ({
        ...prev,
        [data.vendorId]: {
          ...data,
          receivedAt: Date.now(),
          type: 'customer-called'
        }
      }));
    });

    newSocket.on(SOCKET_EVENTS.CUSTOMER_LEFT, (data) => {
      console.log('🚶 Customer left:', data);
      setQueueUpdates(prev => ({
        ...prev,
        [data.vendorId]: {
          ...data,
          receivedAt: Date.now(),
          type: 'customer-left'
        }
      }));
    });

    // Customer-specific notifications
    if (user && user.id) {
      const userId = user.id;
      
      newSocket.on(`customer-${userId}-queue-update`, (data) => {
        console.log('👤 Personal queue update:', data);
        if (data.message) {
          toast.info(data.message);
        }
      });

      newSocket.on(`customer-${userId}-called`, (data) => {
        console.log('🎯 Your turn!:', data);
        toast.info(data.message || 'Your turn has come!');
      });
    }

    // Debug and ping events
    newSocket.on(SOCKET_EVENTS.PONG, (data) => {
      console.log('🏓 Pong received:', data.timestamp);
    });

    newSocket.on(SOCKET_EVENTS.DEBUG_RESPONSE, (data) => {
      console.log('🔍 Debug response:', data);
    });

    return newSocket;
  }, [user]);

  // Setup socket connection
  useEffect(() => {
    let mounted = true;
    let socketInstance = null;

    const setupSocket = async () => {
      try {
        socketInstance = initializeSocket();
        
        if (mounted) {
          setSocket(socketInstance);
        }
      } catch (error) {
        console.error('❌ Failed to initialize socket:', error);
      }
    };

    setupSocket();

    // Cleanup function
    return () => {
      mounted = false;
      if (socketInstance) {
        console.log('🧹 Cleaning up socket connection');
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [initializeSocket]);

  // Join vendor queue room
  const joinVendorQueueRoom = useCallback((vendorId) => {
    if (!socket || !socket.connected) {
      console.warn('⚠️ Cannot join room: socket not connected');
      return false;
    }

    if (!vendorId) {
      console.warn('⚠️ Cannot join room: missing vendorId');
      return false;
    }

    console.log(`📤 Joining vendor room: vendor-${vendorId}`);
    socket.emit(SOCKET_EVENTS.JOIN_VENDOR_QUEUE, vendorId);
    return true;
  }, [socket]);

  // Leave vendor queue room
  const leaveVendorQueueRoom = useCallback((vendorId) => {
    if (!socket || !socket.connected || !vendorId) {
      return false;
    }

    console.log(`📤 Leaving vendor room: vendor-${vendorId}`);
    socket.emit(SOCKET_EVENTS.LEAVE_VENDOR_QUEUE, vendorId);
    return true;
  }, [socket]);

  // Send customer join queue event
  const emitCustomerJoinQueue = useCallback((vendorId, customerId, queueEntry) => {
    if (!socket || !socket.connected) return false;
    
    socket.emit(SOCKET_EVENTS.CUSTOMER_JOIN_QUEUE, {
      vendorId,
      customerId,
      queueEntry
    });
    return true;
  }, [socket]);

  // Send call next customer event
  const emitCallNextCustomer = useCallback((vendorId, customerId, queueEntry) => {
    if (!socket || !socket.connected) return false;
    
    socket.emit(SOCKET_EVENTS.CALL_NEXT_CUSTOMER, {
      vendorId,
      customerId,
      queueEntry
    });
    return true;
  }, [socket]);

  // Send customer left queue event
  const emitCustomerLeftQueue = useCallback((vendorId, customerId, queueId) => {
    if (!socket || !socket.connected) return false;
    
    socket.emit(SOCKET_EVENTS.CUSTOMER_LEFT_QUEUE, {
      vendorId,
      customerId,
      queueId
    });
    return true;
  }, [socket]);

  // Debug function to check socket status
  const debugSocket = useCallback(() => {
    if (socket) {
      const debugInfo = {
        connected: socket.connected,
        id: socket.id,
        queueUpdates: Object.keys(queueUpdates).length,
        isConnected,
        vendorRooms: Object.keys(queueUpdates)
      };
      console.log('🔍 Socket Debug:', debugInfo);
      return debugInfo;
    } else {
      console.log('🔍 Socket Debug: No socket connection');
      return { connected: false, message: 'No socket connection' };
    }
  }, [socket, queueUpdates, isConnected]);

  // Send ping to server
  const sendPing = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.PING);
      return true;
    }
    return false;
  }, [socket]);

  // Request debug rooms info
  const requestDebugRooms = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.DEBUG_ROOMS);
      return true;
    }
    return false;
  }, [socket]);

  // Clear queue updates
  const clearQueueUpdates = useCallback(() => {
    setQueueUpdates({});
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      queueUpdates,
      isConnected,
      joinVendorQueueRoom,
      leaveVendorQueueRoom,
      emitCustomerJoinQueue,
      emitCallNextCustomer,
      emitCustomerLeftQueue,
      debugSocket,
      sendPing,
      requestDebugRooms,
      clearQueueUpdates
    }}>
      {children}
    </SocketContext.Provider>
  );
};

// Export only components
export { SocketProvider, useSocket };