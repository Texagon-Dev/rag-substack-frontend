export interface Chat {
    id: string;
    chat_name?: string;
    created_at: string;
  }
  
  export interface Message {
    id?: string;
    chat_id: string;
    content: string;
    role: 'user' | 'assistant';
    created_at?: string;
  }