"use client";

import { useState, useRef, useEffect, use } from "react";
import { ChatbotMessagesInterface, ChatMessage } from "@/types/messages";
import { markdownComponents } from "@/components/MarkdownComponents";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatbotInterface({ messages, setMessages }: ChatbotMessagesInterface) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);


  const sendMessageAndReadFromStream = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true); 

    try {
        const res = await fetch("http://0.0.0.0:8000/query_chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
        const { value, done } = await reader!.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
            const rawChunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            const lines = rawChunk.split("\n");
            for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            let content = line.slice(6);

            if (content === "") content = "\n";
            if (content === "[DONE]") {
                setLoading(false);
                return;
            }

            setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];

                if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                    ...last,
                    content: last.content + content,
                    };
                } else {
                    // First time we get assistant content, add new message
                    updated.push({ role: "assistant", content });
                }

                return updated;
            });

            }
        }
        }
    } catch (err) {
        console.error(err);
        setLoading(false);
    }
    };


  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const cached = localStorage.getItem("messages");
    if (cached) {
      setMessages(JSON.parse(cached));
    }
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
    <div className="flex-1 px-6 pt-12 w-full max-w-2xl mx-auto">
        <div className="pb-28">
        {messages.map((m, i) => (
            <div
            key={i}
            className={`my-1 px-3 py-2 rounded-lg break-words whitespace-pre-wrap ${
                m.role === "user"
                ? "ml-auto max-w-[66%] w-fit bg-blue-100 text-right text-black"
                : "w-full bg-white text-left"
            }`}
            >
            <ReactMarkdown
                remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
                components={markdownComponents}
            >
                {m.content}
            </ReactMarkdown>
            </div>
        ))}
        {loading && (
            <div className="flex justify-start items-center mt-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-500">Thinking...</span>
            </div>
         )}
        </div>
    </div>

    {/* Fixed input at bottom */}
    <div className="fixed bottom-0 left-0 w-full bg-gray-100 p-4 border-t border-gray-300">
        <div className="w-full max-w-2xl mx-auto flex gap-2">
        <textarea
            ref={textareaRef}
            className="flex-1 max-h-32 overflow-auto p-2 border border-gray-300 rounded-lg text-black resize-none leading-relaxed"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessageAndReadFromStream();
            }
            }}
            placeholder="Type your message..."
            rows={1}
        />

        <button
            className="px-4 py-2 bg-gray-600 text-white rounded-lg self-end h-fit hover:bg-gray-700 transition-colors"
            onClick={sendMessageAndReadFromStream}
        >
            Send
        </button>
        </div>
    </div>
    </div>



  );
}