import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

import { Button } from './components/ui/button';
import { Input } from './components/ui/input';

import { API_END_POINT } from './constant/API_END_POINT';
import type { MessageType, ReplyType } from './types/messages.types';

const socket: Socket = io(import.meta.env.VITE_API_BASE_URL);

function App() {
	const [messages, setMessages] = useState<MessageType[]>([]);
	const [messageInput, setMessageInput] = useState<string>('');
	const [username, setUsername] = useState<string>('Anonymous');
	const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);

	useEffect(() => {
		const fetchMessages = async () => {
			try {
				const response = await fetch(
					`${import.meta.env.VITE_API_BASE_URL}/${
						import.meta.env.VITE_API_PATH
					}/${API_END_POINT.MESSAGES}`,
				);
				const data: MessageType[] = await response.json();

				setMessages(data);
			} catch (error) {
				console.error('Error fetching messages:', error);
			}
		};

		fetchMessages();

		socket.on('message', (message: MessageType) => {
			setMessages((prevMessages) => updateMessages(message, prevMessages));
		});

		return () => {
			socket.off('message');
		};
	}, []);

	const updateMessages = (
		newMessage: MessageType,
		messages: MessageType[],
	): MessageType[] => {
		if (!newMessage.replyTo) return [...messages, newMessage];

		return messages.map((msg): MessageType => {
			if (msg._id === newMessage.replyTo?._id) {
				return {
					...msg,
					replies: [...msg.replies, newMessage as ReplyType],
				};
			}
			return {
				...msg,
				replies: updateMessages(
					newMessage,
					msg.replies as MessageType[],
				) as ReplyType[],
			};
		});
	};

	const sendMessage = (): void => {
		if (messageInput.trim() !== '') {
			const message: Omit<MessageType, '_id' | 'replies' | '__v'> = {
				message: messageInput,
				sender: username,
				timestamp: new Date().toISOString(),
				replyTo: replyingTo
					? {
							...replyingTo,
							_id: replyingTo._id,
							message: replyingTo.message,
							sender: replyingTo.sender,
							replyTo: replyingTo.replyTo,
					  }
					: null,
			};

			socket.emit('message', message);
			setMessageInput('');
			setReplyingTo(null);
		}
	};

	const handleReply = (message: MessageType): void => {
		setReplyingTo(message);
	};

	const renderMessages = (messages: MessageType[]): JSX.Element[] => {
		return messages.map((msg) => (
			<div key={msg._id} className="mb-4">
				<div className="flex flex-col max-w-[250px]">
					<div className="bg-slate-100 px-4 py-2 border rounded-lg ">
						{msg.message}
					</div>
					<div className="flex justify-between gap-2">
						<span className="text-xs text-gray-600">{msg.sender}</span>
						<span className="text-xs text-gray-500 ">
							{new Date(msg.timestamp).toLocaleTimeString()}
						</span>
					</div>

					<div>
						<Button variant="ghost" onClick={() => handleReply(msg)}>
							Reply
						</Button>
					</div>
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
								<Button
									variant="destructive"
									onClick={() => setReplyingTo(null)}
								>
									Cancel
								</Button>
							</div>
						)}
						<div className="mb-4">
							<Input
								type="text"
								placeholder="Enter Your Name"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>
						<div className="flex">
							<Input
								type="text"
								placeholder="Enter Your Comment"
								value={messageInput}
								onChange={(e) => setMessageInput(e.target.value)}
							/>
							<Button onClick={sendMessage}>Send</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
