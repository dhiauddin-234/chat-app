import { io } from 'socket.io-client';

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3002';

let socket;

export const initSocket = () => {
  const token = localStorage.getItem('token');
  if (token && !socket) {
    socket = io(URL, {
      auth: {
        token
      }
    });
  }
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized");
  }
  return socket;
}
