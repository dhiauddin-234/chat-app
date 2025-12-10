import { io } from 'socket.io-client';

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3001';

const socket = io(URL, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token')
  }
});

export default socket;
