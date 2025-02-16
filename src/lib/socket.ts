import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    // Always use the deployment URL
    const socketUrl = 'https://quiz-zeta-rose.vercel.app';
    console.log('Initializing socket connection to:', socketUrl);

    // Create socket instance with specific configuration
    socket = io(socketUrl, {
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true,
      autoConnect: false, // Don't connect automatically
      withCredentials: true,
      extraHeaders: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', socket?.id);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error.message);
      // Try to reconnect with a delay
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        socket?.connect();
      }, 1000);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Try to reconnect with a delay
        setTimeout(() => {
          console.log('Attempting to reconnect after disconnect...');
          socket?.connect();
        }, 1000);
      }
    });

    socket.on('error', (err: string | Error) => {
      const errorMessage = typeof err === 'string' ? err : err.message;
      console.error('Socket error:', errorMessage);
      // Try to reconnect with a delay
      setTimeout(() => {
        console.log('Attempting to reconnect after error...');
        socket?.connect();
      }, 1000);
    });

    // Handle polling transport errors
    socket.io.on('packet', (packet: any) => {
      if (packet.type === 'error') {
        console.error('Transport error:', packet.data);
      }
    });

    // Handle engine errors
    socket.io.engine?.on('error', (err: string | Error) => {
      const errorMessage = typeof err === 'string' ? err : err.message;
      console.error('Engine error:', errorMessage);
    });

    // Now manually connect
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

// Don't create a singleton instance, let components create their own
export default getSocket;
