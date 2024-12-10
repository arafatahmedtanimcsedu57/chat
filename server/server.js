// Server-side Code
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
	replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }],
});
const Chat = mongoose.model('Chat', chatSchema);

// Recursive Population Function
async function populateReplies(chat, depth = 3) {
	if (depth === 0) return chat;
	const populated = await Chat.findById(chat._id)
		.populate('replyTo')
		.populate('replies');

	if (!populated) return chat;

	populated.replies = await Promise.all(
		populated.replies.map((reply) => populateReplies(reply, depth - 1)),
	);
	return populated;
}

// WebSocket connection handling
io.on('connection', (socket) => {
	console.log('A new user has connected', socket.id);

	// Listen for incoming messages
	socket.on('message', async (data) => {
		const { message, sender, replyTo } = data;

		// Save the message to MongoDB
		const chat = new Chat({ message, sender, replyTo });
		const savedChat = await chat.save();

		// If there's a reply, update the parent message to include the new reply
		if (replyTo) {
			await Chat.findByIdAndUpdate(replyTo, {
				$push: { replies: savedChat },
			});
		}

		// Populate the replies and replyTo fields to send the complete message object
		const populatedChat = await populateReplies(savedChat);

		io.emit('message', populatedChat);
	});

	// Handle disconnections
	socket.on('disconnect', () => {
		console.log(socket.id, ' disconnected');
	});
});

app.get('/api/messages', async (req, res) => {
	try {
		// Fetch and recursively populate the chats
		let messages = await Chat.find({ replyTo: null }) // Fetch top-level messages
			.sort({ timestamp: 1 });
		const populatedMessages = await Promise.all(
			messages.map((message) => populateReplies(message)),
		);

		res.status(200).json(populatedMessages);
	} catch (err) {
		console.error('Error fetching messages:', err);
		res.status(500).json({ error: 'Failed to fetch messages' });
	}
});

// Start the server
server.listen(5000, () => {
	console.log('Server is running on port 5000');
});
