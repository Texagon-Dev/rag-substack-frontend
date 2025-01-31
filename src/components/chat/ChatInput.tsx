'use client';

import React, { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isStreaming: boolean;
}

export function ChatInput({ onSendMessage, isLoading, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading || isStreaming) return;

    try {
      setError(null);
      await onSendMessage(message);
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  return (
    <div className="border-t border-gray-700 p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask..."
            disabled={isStreaming || isLoading}
            className="w-full rounded-lg bg-gray-700 text-white p-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || isStreaming || !message.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-gray-600 rounded ${
              isLoading || isStreaming ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading || isStreaming ? 'Processing...' : 'Send'}
          </button>
        </div>
        {error && (
          <p className="text-red-500 mt-2 text-sm">{error}</p>
        )}
      </form>
    </div>
  );
}