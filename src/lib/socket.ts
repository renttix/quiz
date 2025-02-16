import { io } from 'socket.io-client';

// Get the deployment URL from environment variable
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

if (!SOCKET_URL) {
  console.error('NEXT_PUBLIC_SOCKET_URL environment variable is not set');
}

let socket: any = null;

export const getSocket = () => {
  if (!socket) {
    // Use the deployment URL directly
    socket = io('https://quiz-zeta-rose.vercel.app', {
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    socket.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
      // Try to reconnect
      socket.connect();
    });

    socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Try to reconnect if server disconnected
        socket.connect();
      }
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      // Try to reconnect on error
      socket.connect();
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket();
