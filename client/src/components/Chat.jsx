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
			setMessages((prevMessages) => [...prevMessages, message]);
		});

		return () => {
			socket.off('message');
		};
	}, []);

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

	// Recursive function to render messages and their replies
	const renderMessages = (messagesList) => {
		return messagesList.map((msg) => (
			<div key={msg._id} className="mb-2">
				<div className="flex flex-col items-start">
					<span className="text-sm text-gray-500">{msg.sender}</span>
					{msg.replyTo && (
						<div className="bg-gray-200 p-2 rounded-md text-xs mb-1">
							Replying to: {msg.replyTo.message}
						</div>
					)}
					<div className="bg-blue-500 text-white p-2 rounded-md">
						{msg.message}
					</div>
					<span className="text-gray-500 text-xs">
						{new Date(msg.timestamp).toLocaleTimeString()}
					</span>
					<button
						className="text-blue-500 text-xs mt-1"
						onClick={() => handleReply(msg)}
					>
						Reply
					</button>
				</div>
				{/* Render replies recursively */}
				{msg.replies && msg.replies.length > 0 && (
					<div className="ml-4">{renderMessages(msg.replies)}</div>
				)}
			</div>
		));
	};

	return (
		<div className="flex justify-center items-center w-full h-screen bg-gradient-to-b from-blue-300 to-blue-200">
			<div className="bg-white rounded-lg w-96 h-[32rem] p-4 shadow-md">
				<div className="flex flex-col h-full">
					<div className="flex-1 p-2 overflow-y-auto bg-gray-100 rounded-md">
						{renderMessages(messages)}
					</div>
					<div className="p-2 border-t border-gray-300">
						{replyingTo && (
							<div className="mb-2 p-2 bg-gray-200 rounded-md text-sm">
								Replying to: {replyingTo.message}
								<button
									className="text-red-500 ml-2"
									onClick={() => setReplyingTo(null)}
								>
									Cancel
								</button>
							</div>
						)}
						<div className="mb-2">
							<input
								type="text"
								className="w-full px-2 py-1 border rounded-md outline-none"
								placeholder="Enter your username..."
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>
						<div className="flex">
							<input
								type="text"
								className="w-full px-2 py-1 border rounded-l-md outline-none"
								placeholder="Type your message..."
								value={messageInput}
								onChange={(e) => setMessageInput(e.target.value)}
							/>
							<button
								className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
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
