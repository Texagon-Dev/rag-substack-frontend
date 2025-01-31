import { useState, useEffect } from 'react';
import { Chat, Message } from '@/types/chat';

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export function useChat(chatId?: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = {
    credentials: 'include' as const,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  const fetchChats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/chat`, fetchConfig);
      
      // Log the response for debugging
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      // Try to parse JSON only if it's valid
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setChats(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch chats');
      setChats([]);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/chat/${id}/messages`, fetchConfig);
      
      // Log the response for debugging
      console.log('Messages response status:', response.status);
      const responseText = await response.text();
      console.log('Messages response text:', responseText);

      // Try to parse JSON only if it's valid
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setMessages(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch messages');
      setMessages([]);
    }
  };

  const createChat = async (chatName: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/chat/create`, {
        ...fetchConfig,
        method: 'POST',
        body: JSON.stringify({ chatName }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setChats(prev => [data, ...prev]);
      setError(null);
      return data;
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chat');
      throw error;
    }
  };

  const sendMessage = async (message: string) => {
    if (!chatId || !message.trim()) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, { 
      chat_id: chatId, 
      content: message, 
      role: 'user' 
    }]);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        ...fetchConfig,
        body: JSON.stringify({ message }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        console.error('Error response text:', responseText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let currentResponse = '';

      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(
          `${BACKEND_URL}/chat`
        );

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chunk') {
              currentResponse += data.content;
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.role === 'assistant') {
                  return [...prev.slice(0, -1), 
                    { ...lastMessage, content: currentResponse }
                  ];
                }
                return [...prev, 
                  { chat_id: chatId, content: currentResponse, role: 'assistant' }
                ];
              });
            } else if (data.type === 'complete') {
              eventSource.close();
              setIsLoading(false);
              setError(null);
              resolve(currentResponse);
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
            eventSource.close();
            setIsLoading(false);
            setError('Error processing server response');
            reject(error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('EventSource error:', error);
          eventSource.close();
          setIsLoading(false);
          setError('Connection error');
          reject(error);
        };
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      throw error;
    }
  };

  useEffect(() => {
    fetchChats();
    if (chatId) {
      fetchMessages(chatId);
    }
  }, [chatId]);

  return {
    chats,
    messages,
    isLoading,
    error,
    sendMessage,
    createChat,
  };
}