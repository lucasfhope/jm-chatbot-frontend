export default function Header({ onNewChat }: { onNewChat: () => void }) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-white shadow-md">
      <h1 className="text-lg font-semibold text-black">Price Analyzer</h1>
      <button 
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        onClick={onNewChat}
      >
        New Chat
      </button>
    </header>
  );
}
