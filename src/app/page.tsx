"use client"

import ChatbotInterface from "@/components/ChatbotInterface";
import Header from "@/components/Header";
import { ChatMessage } from "@/types/messages";
import { useState, useEffect } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem("messages");
    if (cached) {
      setMessages(JSON.parse(cached));
    }
  }, []);

  // Save to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  return (
    <div>
      <Header onNewChat={() => setMessages([])} />
      <ChatbotInterface messages={messages} setMessages={setMessages} />
    </div>
  );
}
