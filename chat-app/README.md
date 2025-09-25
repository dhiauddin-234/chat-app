# Real-time Chat Application

A real-time chat application built with React, Node.js, Express, and Socket.io.

## Features

- Real-time messaging
- User presence (see who's online)
- Join/leave notifications
- Responsive design
- Clean and modern UI

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher) or yarn

## Installation

1. Clone the repository

2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

## Running the Application

1. Start the server:
   ```bash
   cd server
   npm start
   ```
   The server will start on port 5000 by default.

2. In a new terminal, start the React development server:
   ```bash
   cd client
   npm start
   ```
   The React app will open in your default browser at http://localhost:3000

3. Open http://localhost:3000 in multiple browser windows to test the chat with different users.

## Project Structure

- `/client` - React frontend application
- `/server` - Node.js/Express backend with Socket.io

## Available Scripts

In the project directory, you can run:

### Server
- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon

### Client
- `npm start` - Start the React development server
- `npm test` - Run tests
- `npm run build` - Build the app for production

## Dependencies

### Server
- express: Web framework
- socket.io: Real-time bidirectional event-based communication
- cors: Enable CORS

### Client
- react: UI library
- react-dom: React renderer for the web
- socket.io-client: Socket.io client library
- react-scripts: Create React App scripts and configuration
