 'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Chat {
  id: string;
  created_at: string;
}

interface SidebarProps {
  chats: Chat[];
  onNewChat: () => void;
  className?: string;
}

export function Sidebar({ chats, onNewChat, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={`bg-gray-900 w-64 flex flex-col h-screen ${className}`}>
      <button
        onClick={onNewChat}
        className="p-4 text-white flex items-center gap-2 hover:bg-gray-800"
      >
        + New Chat
      </button>

      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className={`block p-3 rounded-lg truncate hover:bg-gray-700 transition ${
              pathname === `/chat/${chat.id}` ? 'bg-gray-700' : ''
            }`}
          >
            Chat {new Date(chat.created_at).toLocaleDateString()}
          </Link>
        ))}
      </div>
    </div>
  );
}