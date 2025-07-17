"use client"

import ChatbotInterface from "@/components/ChatbotInterface";
import Header from "@/components/Header";
import { ChatMessage } from "@/types/messages";
import { useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  return (
    <div>
      <Header onNewChat={() => setMessages([])} />
      <ChatbotInterface messages={messages} setMessages={setMessages} />
    </div>
  );
}
