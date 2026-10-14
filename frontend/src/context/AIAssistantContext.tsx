'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartData {
  id: string;
  type: 'bar' | 'line' | 'pie';
  title: string;
  labels: string[];
  datasets: ChartDataset[];
}

export interface MessageMetadata {
  tools_used?: string[];
  date_range?: string;
  [key: string]: any;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  charts?: ChartData[];
  metadata?: MessageMetadata;
  timestamp: string;
}

interface AIAssistantContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  statusText: string | null;
  errorMsg: string | null;
  setErrorMsg: (val: string | null) => void;
  expandedHowMap: Record<string, boolean>;
  toggleHow: (id: string) => void;
  sendMessage: (queryText?: string) => Promise<void>;
  handleResetChat: () => void;
  clearChatStorage: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

export const useAIAssistant = () => {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return ctx;
};

export const getAIAssistantStorageKey = (userId?: string) => `smart_frontdesk_chat_${userId || 'anonymous'}`;

const createWelcomeMessage = (fullName?: string): Message => ({
  id: 'init-msg',
  role: 'assistant',
  content: `Hello ${fullName || 'there'}! I am your AI Executive Assistant for the Smart Front Desk System.\n\nI can analyze visitor traffic, lobby congestion, hourly trends, and department breakdowns in real-time. Ask a question or click a prompt below to get started.`,
  metadata: {
    tools_used: ['system_welcome'],
    date_range: 'Africa/Addis_Ababa Calendar'
  },
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

export function AIAssistantProvider({ 
  children, 
  currentUser 
}: { 
  children: React.ReactNode; 
  currentUser?: any;
}) {
  const userId = currentUser?.id;
  const fullName = currentUser?.full_name;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedHowMap, setExpandedHowMap] = useState<Record<string, boolean>>({});

  // Initialize messages from sessionStorage if available for this specific user
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined' && userId) {
      try {
        const stored = sessionStorage.getItem(getAIAssistantStorageKey(userId));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load chat from sessionStorage', e);
      }
    }
    return [createWelcomeMessage(fullName)];
  });

  // Track previous userId to handle user changes (e.g. login switch)
  const prevUserIdRef = useRef<string | undefined>(userId);

  useEffect(() => {
    if (userId && userId !== prevUserIdRef.current) {
      prevUserIdRef.current = userId;
      try {
        const stored = sessionStorage.getItem(getAIAssistantStorageKey(userId));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load chat for user', e);
      }
      setMessages([createWelcomeMessage(fullName)]);
    }
  }, [userId, fullName]);

  // Keep sessionStorage in sync whenever messages change (capped at last 50)
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    try {
      // Cap at last 50 messages, storing messages, charts, and metadata (NO auth token)
      const toStore = messages.slice(-50);
      sessionStorage.setItem(getAIAssistantStorageKey(userId), JSON.stringify(toStore));
    } catch (e) {
      console.error('Failed to persist chat to sessionStorage', e);
    }
  }, [messages, userId]);

  const toggleHow = (id: string) => {
    setExpandedHowMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const clearChatStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      if (userId) {
        sessionStorage.removeItem(getAIAssistantStorageKey(userId));
      }
    } catch (e) {
      console.error('Failed to clear chat storage', e);
    }
  };

  const handleResetChat = () => {
    clearChatStorage();
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: `Conversation reset. How can I assist you with front desk intelligence?`,
        metadata: {
          tools_used: ['system_welcome'],
          date_range: 'Africa/Addis_Ababa Calendar'
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorMsg(null);
    setExpandedHowMap({});
  };

  const sendMessage = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isLoading) return;

    setErrorMsg(null);
    setInput('');
    setStatusText('Looking up visitor data...');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        throw new Error('You are not authenticated. Please log in again.');
      }

      // Send the last 10 messages from the conversation (excluding init greetings)
      const historyPayload = messages
        .filter(m => m.id !== 'init-msg' && !m.id.startsWith('init-'))
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const streamRes = await fetch(`${apiBase}/assistant/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      if (!streamRes.ok) {
        const errData = await streamRes.json().catch(() => null);
        if (streamRes.status === 403) {
          throw new Error('Access Denied: You do not have the AI Executive Assistant permission (22_ai_assistant).');
        }
        if (streamRes.status === 429) {
          throw new Error('Rate limit exceeded: Please wait a moment before sending another query.');
        }
        if (errData?.detail) {
          throw new Error(errData.detail);
        }
        if (streamRes.status === 503) {
          throw new Error('AI Assistant is not configured on the backend (AI_API_KEY is not set).');
        }
        throw new Error(`Server error (${streamRes.status})`);
      }

      if (!streamRes.body) {
        throw new Error('ReadableStream not supported by browser.');
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const assistantMsgId = `asst-${Date.now()}`;
      let accumulatedContent = '';
      let hasCreatedAssistantMsg = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.replace('event:', '').trim();
          } else if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (currentEvent === 'status') {
                setStatusText(parsed.status || 'Looking up visitor data...');
              } else if (currentEvent === 'delta') {
                setStatusText(null);
                accumulatedContent += parsed.delta || '';
                if (!hasCreatedAssistantMsg) {
                  hasCreatedAssistantMsg = true;
                  setIsLoading(false);
                  setMessages(prev => [
                    ...prev,
                    {
                      id: assistantMsgId,
                      role: 'assistant',
                      content: accumulatedContent,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                } else {
                  setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
                  ));
                }
              } else if (currentEvent === 'done') {
                setStatusText(null);
                setIsLoading(false);
                const finalAnswer = parsed.answer || accumulatedContent;
                if (!hasCreatedAssistantMsg) {
                  hasCreatedAssistantMsg = true;
                  setMessages(prev => [
                    ...prev,
                    {
                      id: assistantMsgId,
                      role: 'assistant',
                      content: finalAnswer,
                      charts: parsed.charts && parsed.charts.length > 0 ? parsed.charts : undefined,
                      metadata: parsed.metadata,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                } else {
                  setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? {
                      ...m,
                      content: finalAnswer,
                      charts: parsed.charts && parsed.charts.length > 0 ? parsed.charts : undefined,
                      metadata: parsed.metadata
                    } : m
                  ));
                }
              } else if (currentEvent === 'error') {
                throw new Error(parsed.error || 'AI generation encountered an error.');
              }
            } catch (err: any) {
              if (currentEvent === 'error') throw err;
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'Failed to communicate with AI Assistant.');
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  };

  return (
    <AIAssistantContext.Provider
      value={{
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        statusText,
        errorMsg,
        setErrorMsg,
        expandedHowMap,
        toggleHow,
        sendMessage,
        handleResetChat,
        clearChatStorage
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}
