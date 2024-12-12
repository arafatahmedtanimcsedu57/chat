import { useState, useEffect } from "react";
import io, { Socket } from "socket.io-client";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

import { API_END_POINT } from "./constant/API_END_POINT";
import type { MessageType, ReplyType } from "./types/messages.types";

const socket: Socket = io(import.meta.env.VITE_API_BASE_URL);

function App() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [username, setUsername] = useState<string>("Anonymous");
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/${
            import.meta.env.VITE_API_PATH
          }/${API_END_POINT.MESSAGES}`
        );
        const data: MessageType[] = await response.json();

        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    socket.on("message", (message: MessageType) => {
      setMessages((prevMessages) => updateMessages(message, prevMessages));
    });

    return () => {
      socket.off("message");
    };
  }, []);

  const updateMessages = (
    newMessage: MessageType,
    messages: MessageType[]
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
          msg.replies as MessageType[]
        ) as ReplyType[],
      };
    });
  };

  const sendMessage = (): void => {
    if (messageInput.trim() !== "") {
      const message: Omit<MessageType, "_id" | "replies" | "__v"> = {
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

      socket.emit("message", message);
      setMessageInput("");
      setReplyingTo(null);
    }
  };

  const handleReply = (message: MessageType): void => {
    setReplyingTo(message);
  };

  const getBackgroundColor = (level: number): string => {
    const colors = [
      "bg-slate-50", // Level 0
      "bg-slate-100", // Level 1
      "bg-slate-200", // Level 2
      "bg-slate-300", // Level 3
      "bg-slate-400", // Level 4
    ];
    return colors[Math.min(level, colors.length - 1)];
  };

  const renderMessages = (
    messages: MessageType[],
    level = 0
  ): JSX.Element[] => {
    return messages.map((msg, index) => {
      return (
        <div
          key={msg._id}
          className={`mb-4 ${getBackgroundColor(level)} p-4 rounded-lg ${
            index === messages.length - 1 ? "animate-angel-flight" : ""
          }`}
        >
          <div className="flex flex-col">
            <div className="flex gap-2">
              <span className="text-xs text-gray-700">{msg.sender}</span>
              <span className="text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="py-2 max-w-[650px] rounded-full font-medium text-sm text-gray-800">
              {msg.message}{" "}
            </div>
            <div className="flex gap-2 items-center">
              {msg._id === replyingTo?._id ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => handleReply(msg)}
                  className="text-xs p-0 text-blue-600"
                >
                  Reply
                </Button>
              )}
            </div>
            {msg.replies && msg.replies.length > 0 && (
              <div className="ml-6 border-l border-gray-300 pl-4 mt-2">
                {renderMessages(msg.replies, level + 1)}
              </div>
            )}
          </div>
        </div>
      );
    });
  };
  return (
    <div className="flex justify-center items-center w-full h-screen">
      <div className=" w-full h-full p-6 shadow-xl">
        <div className="flex flex-col h-full">
          <div className="flex-1 p-2 overflow-y-auto bg-gray-50 rounded-md border border-gray-300">
            {renderMessages(messages)}
          </div>
          <div className=" mt-4">
            {replyingTo && (
              <div className="p-3 bg-gray-200 border rounded-t-lg text-sm flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-4">
                  <span>Replying to: </span>
                  <div className="flex gap-2 items-center">
                    <p className="text-indigo-600 font-semibold">
                      {replyingTo.sender}
                    </p>
                    <div className="bg-white px-2 rounded-full border">
                      {replyingTo.message}
                    </div>
                  </div>
                </span>
                <Button
                  variant="destructive"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <div className="flex mb-4">
              <Input
                className={`${
                  replyingTo ? "rounded-t-none" : ""
                } rounded-e-none`}
                type="text"
                placeholder="Enter Your Comment"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <Button
                onClick={sendMessage}
                className={`rounded-s-none ${
                  replyingTo ? "rounded-t-none" : ""
                } px-5 bg-indigo-700`}
              >
                Send
              </Button>
            </div>

            <div>
              <Input
                type="text"
                placeholder="Enter Your Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
