export type Role = "user" | "assistant";

export type ChatMessage = {
  role: Role;
  content: string;
};

export type SetChatMessages = React.Dispatch<React.SetStateAction<ChatMessage[]>>;

export interface ChatbotMessagesInterface {
  messages: ChatMessage[];
  setMessages: SetChatMessages;
}
