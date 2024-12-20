// Frontend Code
import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Replace with your server address

function Chat() {
	const [messages, setMessages] = useState([]);
	const [messageInput, setMessageInput] = useState('');
	const [username, setUsername] = useState('Anonymous');
	const [replyingTo, setReplyingTo] = useState(null); // To track the message being replied to

	useEffect(() => {
		// Fetch initial messages
		const fetchMessages = async () => {
			try {
				const response = await fetch('http://localhost:5000/api/messages');
				const data = await response.json();
				setMessages(data);
			} catch (error) {
				console.error('Error fetching messages:', error);
			}
		};

		fetchMessages();

		// Listen for incoming messages
		socket.on('message', (message) => {
			setMessages((prevMessages) => updateMessages(message, prevMessages));
		});

		return () => {
			socket.off('message');
		};
	}, []);

	const updateMessages = (newMessage, messages) => {
		if (!newMessage.replyTo) return [...messages, newMessage]; // Top-level message

		return messages.map((msg) => {
			if (msg._id === newMessage.replyTo._id) {
				return {
					...msg,
					replies: [...msg.replies, newMessage],
				};
			}
			return {
				...msg,
				replies: updateMessages(newMessage, msg.replies),
			};
		});
	};

	const sendMessage = () => {
		if (messageInput.trim() !== '') {
			const message = {
				message: messageInput,
				sender: username,
				timestamp: new Date(),
				replyTo: replyingTo?._id || null, // Include the ID of the message being replied to
			};

			socket.emit('message', message); // Emit message to server
			setMessageInput(''); // Clear input field
			setReplyingTo(null); // Reset reply context
		}
	};

	const handleReply = (message) => {
		setReplyingTo(message);
	};

	const renderMessages = (messages) => {
		return messages.map((msg) => (
			<div key={msg._id} className="mb-4">
				<div className="flex flex-col items-start">
					<span className="text-sm text-gray-700 font-semibold">
						{msg.sender}
					</span>

					<div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md">
						{msg.message}
					</div>
					<span className="text-gray-500 text-xs italic mt-1">
						{new Date(msg.timestamp).toLocaleTimeString()}
					</span>
					<button
						className="text-blue-600 text-xs mt-1 hover:underline"
						onClick={() => handleReply(msg)}
					>
						Reply
					</button>
					{msg.replies && msg.replies.length > 0 && (
						<div className="ml-6 border-l-2 border-gray-300 pl-4 mt-2">
							{renderMessages(msg.replies)}
						</div>
					)}
				</div>
			</div>
		));
	};

	return (
		<div className="flex justify-center items-center w-full h-screen">
			<div className=" w-full h-full p-6 shadow-xl">
				<div className="flex flex-col h-full">
					<div className="flex-1 p-2 overflow-y-auto bg-gray-50 rounded-md border border-gray-300">
						{renderMessages(messages)}
					</div>
					<div className="p-2 mt-4">
						{replyingTo && (
							<div className="mb-3 p-2 bg-gray-100 rounded-md text-sm flex justify-between items-center">
								<span className="text-gray-700">
									Replying to: {replyingTo.message}
								</span>
								<button
									className="text-red-500 text-sm font-bold hover:text-red-700"
									onClick={() => setReplyingTo(null)}
								>
									Cancel
								</button>
							</div>
						)}
						<div className="mb-4">
							<input
								type="text"
								className="w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
								placeholder="Enter your username..."
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>
						<div className="flex">
							<input
								type="text"
								className="w-full px-3 py-2 border-t border-b border-l rounded-l-md outline-none focus:ring-2 focus:ring-indigo-500"
								placeholder="Type your message..."
								value={messageInput}
								onChange={(e) => setMessageInput(e.target.value)}
							/>
							<button
								className="px-5 py-2 bg-indigo-500 text-white rounded-r-md hover:bg-indigo-600"
								onClick={sendMessage}
							>
								Send
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Chat;
