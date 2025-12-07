// client/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

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

  useEffect(() => {
    let mounted = true;
    
    const initializeSocket = () => {
      const newSocket = io('http://localhost:5000', {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        if (mounted) {
          setSocket(newSocket);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        if (mounted) {
          setSocket(null);
        }
      });

      // Listen for queue updates
      newSocket.on('queue-updated', (data) => {
        if (mounted) {
          setQueueUpdates(prev => ({
            ...prev,
            [data.vendorId]: data
          }));
        }
      });

      newSocket.on('customer-called', (data) => {
        if (mounted) {
          setQueueUpdates(prev => ({
            ...prev,
            [data.queueEntry.vendorId]: data
          }));
        }
      });

      // Set socket immediately (but React will batch this update)
      if (mounted) {
        setSocket(newSocket);
      }

      return newSocket;
    };

    const newSocket = initializeSocket();

    return () => {
      mounted = false;
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  const joinVendorQueueRoom = (vendorId) => {
    if (socket) {
      socket.emit('join-vendor-queue', vendorId);
    }
  };

  const leaveVendorQueueRoom = (vendorId) => {
    if (socket) {
      socket.emit('leave-vendor-queue', vendorId);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      queueUpdates,
      joinVendorQueueRoom,
      leaveVendorQueueRoom,
      isConnected: socket?.connected || false
    }}>
      {children}
    </SocketContext.Provider>
  );
};

// Named exports
export { SocketProvider, useSocket };