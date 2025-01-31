'use client';

import { useEffect, useState, useRef } from 'react';
import { use } from 'react';
import { Sidebar } from '@/components/chat/Sidebar';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const fetchConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'include' as const,
};

interface Message {
  content: string;
  role: 'user' | 'assistant';
}

interface Chat {
  id: string;
  title?: string;
  created_at: string;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentChatId || currentChatId === 'new') return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`${BACKEND_URL}/chat/${currentChatId}/messages`, {
          ...fetchConfig
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`);
        }

        const data = await response.json();
        setMessages(data);
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch messages');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [currentChatId]);

  useEffect(() => {
    if (resolvedParams.id && resolvedParams.id !== 'new') {
      setCurrentChatId(resolvedParams.id);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
          ...fetchConfig
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch chats: ${response.status}`);
        }

        const data = await response.json();
        setChats(data);
      } catch (error) {
        console.error('Error fetching chats:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch chats');
      }
    };

    fetchChats();
  }, []); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'user', content: message }]);

      if (resolvedParams.id === 'new' && !currentChatId) {
        const createResponse = await fetch(`${BACKEND_URL}/chat/create`, {
          method: 'POST',
          ...fetchConfig,
          body: JSON.stringify({ chatName: message.substring(0, 50) }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create chat');
        }

        const newChat = await createResponse.json();
        setCurrentChatId(newChat.id);
        
        await setupStream(message, newChat.id);
        router.push(`/chat/${newChat.id}`);
      } else {
        const chatId = currentChatId || resolvedParams.id;
        await setupStream(message, chatId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.slice(0, -1));
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const setupStream = async (message: string, chatId: string) => {
    setIsStreaming(true);
    let currentResponse = '';

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        ...fetchConfig,
        headers: {
          ...fetchConfig.headers,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ message, chatId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                currentResponse += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = currentResponse;
                  }
                  return newMessages;
                });
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }

      setIsStreaming(false);
      setIsLoading(false);
      return currentResponse;
    } catch (error) {
      console.error('Stream error:', error);
      setMessages(prev => prev.slice(0, -1));
      setIsStreaming(false);
      setIsLoading(false);
      throw error;
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    router.push('/chat/new');
  };

  return (
    <div className="flex h-screen bg-gray-800">
      <Sidebar chats={chats} onNewChat={handleNewChat} />
      <main className="flex-1 flex flex-col">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isStreaming={isStreaming}
        />
      </main>
    </div>
  );
}