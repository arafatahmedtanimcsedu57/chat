export type ReplyType = {
	_id: string;
	message: string;
	sender: string;
	replyTo: ReplyType | null; // Nested replyTo is simplified to avoid circular reference
	replies: ReplyType[]; // Can be an array of reply IDs or full Reply objects
	timestamp: string;
	__v: number;
};

export type MessageType = {
	_id: string;
	message: string;
	sender: string;
	replyTo: ReplyType | null;
	replies: ReplyType[];
	timestamp: string;
	__v: number;
};
