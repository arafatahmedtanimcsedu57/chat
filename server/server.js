const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// Initialize Express and create HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(
	cors({
		origin: 'http://localhost:5173', // Replace with your frontend's URL
		credentials: true, // Allow credentials (cookies, authorization headers)
	}),
);

const io = new Server(server, {
	cors: {
		origin: 'http://localhost:5173', // Same as above
		credentials: true,
	},
});

// Middleware to parse JSON
app.use(express.json());

// Connect to MongoDB
mongoose
	.connect('mongodb://localhost:27017/chatDB', {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log('Connected to MongoDB'))
	.catch((err) => console.error('MongoDB connection error:', err));

// Define a Chat schema and model
const chatSchema = new mongoose.Schema({
	message: String,
	sender: String,
	timestamp: { type: Date, default: Date.now },
	replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', default: null },
});
const Chat = mongoose.model('Chat', chatSchema);

// WebSocket connection handling
io.on('connection', (socket) => {
	console.log('A new user has connected', socket.id);

	// Listen for incoming messages
	socket.on('message', async (data) => {
		const { message, sender, replyTo } = data;

		// Save the message to MongoDB
		const chat = new Chat({ message, sender, replyTo });
		const savedChat = await chat.save();

		// Broadcast the message to all connected clients
		const populatedChat = await Chat.findById(savedChat._id).populate(
			'replyTo',
		);

		io.emit('message', populatedChat);
	});

	// Handle disconnections
	socket.on('disconnect', () => {
		console.log(socket.id, ' disconnected');
	});
});

// API to get all chat messages
app.get('/api/messages', async (req, res) => {
	try {
		const messages = await Chat.find().sort({ timestamp: 1 });
		res.status(200).json(messages);
	} catch (err) {
		res.status(500).json({ error: 'Failed to fetch messages' });
	}
});

// Start the server
server.listen(5000, () => {
	console.log('Server is running on port 5000');
});
