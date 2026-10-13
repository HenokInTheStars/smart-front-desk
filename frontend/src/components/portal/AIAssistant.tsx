'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, Sparkles, RefreshCw, AlertCircle, Copy, Check, 
  BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon, 
  Clock, ArrowRight, ShieldCheck, CornerDownLeft, Layers,
  HelpCircle, ChevronDown, ChevronUp, Calendar, TrendingUp,
  Building2, Timer, AlertTriangle, Users, BookOpen
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';

interface AIAssistantProps {
  currentUser: any;
}

interface ChartDataset {
  label: string;
  data: number[];
}

interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie';
  title: string;
  labels: string[];
  datasets: ChartDataset[];
}

interface MessageMetadata {
  tools_used?: string[];
  date_range?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  charts?: ChartData[];
  metadata?: MessageMetadata;
  timestamp: string;
}

const PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16'  // Lime
];

const SUGGESTED_PROMPTS = [
  {
    icon: Calendar,
    category: 'Traffic & Arrival',
    label: "Today's Attendance",
    query: 'How many people came today?'
  },
  {
    icon: TrendingUp,
    category: 'Hourly Comparison',
    label: 'Hourly Comparison',
    query: 'Compare hourly traffic yesterday vs today.'
  },
  {
    icon: Building2,
    category: 'Departments',
    label: 'Top Departments',
    query: 'Which departments had the most visitors this year?'
  },
  {
    icon: Timer,
    category: 'Visit Duration',
    label: 'Average & Median Duration',
    query: 'What is our average and median visit duration this year?'
  },
  {
    icon: PieChartIcon,
    category: 'Visitor Sources',
    label: 'Walk-ins vs Pre-registered',
    query: 'What is the ratio of walk-ins vs pre-registered visitors this month?'
  },
  {
    icon: AlertTriangle,
    category: 'Fulfillment Rates',
    label: 'No-Shows & Cancellations',
    query: 'What are our no show and cancellation rates this year?'
  },
  {
    icon: Users,
    category: 'Live Operations',
    label: 'Lobby & Host Availability',
    query: 'How busy is the reception right now and what hosts are available?'
  },
  {
    icon: BookOpen,
    category: 'Facility Knowledge',
    label: 'Guest Reassignment',
    query: 'How do I reassign an arrived visitor when their host is unavailable?'
  }
];

export default function AIAssistant({ currentUser }: AIAssistantProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedHowMap, setExpandedHowMap] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content: `Hello ${currentUser?.full_name || 'there'}! I am your AI Executive Assistant for the Smart Front Desk System.\n\nI can analyze visitor traffic, lobby congestion, hourly trends, and department breakdowns in real-time. Ask a question or click a prompt below to get started.`,
      metadata: {
        tools_used: ['system_welcome'],
        date_range: 'Africa/Addis_Ababa Calendar'
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleHow = (id: string) => {
    setExpandedHowMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetChat = () => {
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

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        throw new Error('You are not authenticated. Please log in again.');
      }

      // Send the last 10 messages as history so follow-ups work
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
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Recharts Helper: Transform ChartData for Line/Bar charts
  const formatSeriesData = (chart: ChartData) => {
    return chart.labels.map((label, idx) => {
      const point: any = { name: label };
      chart.datasets.forEach(ds => {
        point[ds.label] = ds.data[idx] ?? 0;
      });
      return point;
    });
  };

  // Recharts Helper: Transform ChartData for Pie charts
  const formatPieData = (chart: ChartData) => {
    const ds = chart.datasets[0];
    if (!ds) return [];
    return chart.labels.map((label, idx) => ({
      name: label,
      value: ds.data[idx] ?? 0
    }));
  };

  const isChatEmpty = messages.length <= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground font-sans">
      
      {/* Top Banner & Control Bar */}
      <div className="border-b border-border bg-card/60 backdrop-blur px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight">AI Executive Assistant</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Analytics & Grounded Docs
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Read-only Postgres aggregation & facility documentation intelligence (Addis Ababa EAT)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shadow-sm disabled:opacity-50"
            title="Start new conversation"
          >
            <RefreshCw size={13} />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Main Conversation Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        
        {/* Quick Suggestion Chips Header when conversation is ongoing */}
        {!isChatEmpty && (
          <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-muted-foreground text-[11px] shrink-0 font-medium">Quick ask:</span>
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt.query)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-card hover:bg-primary/10 border border-border hover:border-primary/30 text-[11px] text-foreground shrink-0 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <span>{prompt.label}</span>
                <ArrowRight size={10} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Message Thread */}
        <div className="max-w-4xl mx-auto space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-1 shadow-sm">
                    <Bot size={18} />
                  </div>
                )}

                <div className={`max-w-2xl lg:max-w-3xl space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                  
                  {/* Message Bubble */}
                  <div className={`p-4 rounded-2xl shadow-sm border ${
                    isUser 
                      ? 'bg-primary text-primary-foreground border-primary rounded-tr-none' 
                      : 'bg-card text-foreground border-border rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                      {msg.content}
                    </div>

                    <div className={`flex items-center justify-between gap-4 mt-2 pt-2 border-t text-[11px] ${
                      isUser ? 'border-primary-foreground/20 text-primary-foreground/80' : 'border-border/60 text-muted-foreground'
                    }`}>
                      <div className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>{msg.timestamp}</span>
                      </div>

                      {!isUser && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-foreground transition-colors flex items-center gap-1 p-0.5 rounded"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible "How I got this" row under assistant messages */}
                  {!isUser && msg.id !== 'init-msg' && msg.metadata && (
                    <div className="px-1 text-xs">
                      <button
                        onClick={() => toggleHow(msg.id)}
                        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium text-[11px] py-1 px-2 rounded-lg bg-muted/40 hover:bg-muted/70 border border-border/50"
                      >
                        <HelpCircle size={12} className="text-primary" />
                        <span>How I got this</span>
                        {expandedHowMap[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {expandedHowMap[msg.id] && (
                        <div className="mt-1.5 p-3 rounded-xl bg-card border border-border text-[11px] space-y-2 animate-fade-in shadow-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-muted-foreground">Tools Used:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.metadata.tools_used && msg.metadata.tools_used.length > 0 ? (
                                msg.metadata.tools_used.map((toolName, tIdx) => (
                                  <span key={tIdx} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[10px] border border-primary/20">
                                    {toolName}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground italic">Direct reasoning</span>
                              )}
                            </div>
                          </div>
                          {msg.metadata.date_range && (
                            <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                              <span className="font-semibold text-muted-foreground">Date Range:</span>
                              <span className="text-foreground font-medium">{msg.metadata.date_range}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Render Visual Charts if returned by backend tools */}
                  {msg.charts && msg.charts.length > 0 && (
                    <div className="space-y-4 w-full">
                      {msg.charts.map((chart) => {
                        const seriesData = formatSeriesData(chart);
                        const pieData = formatPieData(chart);

                        return (
                          <div 
                            key={chart.id} 
                            className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-border pb-2.5">
                              <div className="flex items-center gap-2">
                                {chart.type === 'line' && <LineChartIcon size={16} className="text-primary" />}
                                {chart.type === 'bar' && <BarChart2 size={16} className="text-primary" />}
                                {chart.type === 'pie' && <PieChartIcon size={16} className="text-primary" />}
                                <h3 className="text-sm font-bold tracking-tight">{chart.title}</h3>
                              </div>
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted">
                                {chart.type} Chart
                              </span>
                            </div>

                            <div className="h-64 w-full pt-2">
                              {chart.type === 'line' && (
                                <ResponsiveContainer width="100%" height={250}>
                                  <LineChart data={seriesData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#e4e4e7'} />
                                    <XAxis 
                                      dataKey="name" 
                                      stroke={isDark ? '#a1a1aa' : '#71717a'} 
                                      fontSize={11} 
                                    />
                                    <YAxis 
                                      stroke={isDark ? '#a1a1aa' : '#71717a'} 
                                      fontSize={11} 
                                      allowDecimals={false} 
                                    />
                                    <RechartsTooltip 
                                      contentStyle={{ 
                                        backgroundColor: isDark ? '#18181b' : '#ffffff', 
                                        borderColor: isDark ? '#27272a' : '#e4e4e7',
                                        borderRadius: '0.75rem',
                                        color: isDark ? '#f4f4f5' : '#18181b',
                                        fontSize: '12px'
                                      }} 
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                    {chart.datasets.map((ds, dIdx) => (
                                      <Line
                                        key={ds.label}
                                        type="monotone"
                                        dataKey={ds.label}
                                        stroke={PALETTE[dIdx % PALETTE.length]}
                                        strokeWidth={2.5}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                      />
                                    ))}
                                  </LineChart>
                                </ResponsiveContainer>
                              )}

                              {chart.type === 'bar' && (
                                <ResponsiveContainer width="100%" height={250}>
                                  <BarChart data={seriesData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#e4e4e7'} />
                                    <XAxis 
                                      dataKey="name" 
                                      stroke={isDark ? '#a1a1aa' : '#71717a'} 
                                      fontSize={11} 
                                    />
                                    <YAxis 
                                      stroke={isDark ? '#a1a1aa' : '#71717a'} 
                                      fontSize={11} 
                                      allowDecimals={false} 
                                    />
                                    <RechartsTooltip 
                                      contentStyle={{ 
                                        backgroundColor: isDark ? '#18181b' : '#ffffff', 
                                        borderColor: isDark ? '#27272a' : '#e4e4e7',
                                        borderRadius: '0.75rem',
                                        color: isDark ? '#f4f4f5' : '#18181b',
                                        fontSize: '12px'
                                      }} 
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                    {chart.datasets.map((ds, dIdx) => (
                                      <Bar
                                        key={ds.label}
                                        dataKey={ds.label}
                                        fill={PALETTE[dIdx % PALETTE.length]}
                                        radius={[4, 4, 0, 0]}
                                      />
                                    ))}
                                  </BarChart>
                                </ResponsiveContainer>
                              )}

                              {chart.type === 'pie' && (
                                <ResponsiveContainer width="100%" height={250}>
                                  <RePieChart>
                                    <RechartsTooltip 
                                      contentStyle={{ 
                                        backgroundColor: isDark ? '#18181b' : '#ffffff', 
                                        borderColor: isDark ? '#27272a' : '#e4e4e7',
                                        borderRadius: '0.75rem',
                                        color: isDark ? '#f4f4f5' : '#18181b',
                                        fontSize: '12px'
                                      }} 
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                    <Pie
                                      data={pieData}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={75}
                                      innerRadius={35}
                                      paddingAngle={4}
                                      label={({ name, percent }: any) => `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    >
                                      {pieData.map((_, pIdx) => (
                                        <Cell 
                                          key={`cell-${pIdx}`} 
                                          fill={PALETTE[pIdx % PALETTE.length]} 
                                        />
                                      ))}
                                    </Pie>
                                  </RePieChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          {/* Hero Empty State with 8 Clickable Suggested Questions (Shown when chat is empty) */}
          {isChatEmpty && (
            <div className="max-w-4xl mx-auto my-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles size={14} className="text-primary" />
                <span>Recommended Operational Inquiries</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SUGGESTED_PROMPTS.map((prompt, idx) => {
                  const IconComponent = prompt.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => sendMessage(prompt.query)}
                      disabled={isLoading}
                      className="text-left p-3.5 rounded-xl bg-card hover:bg-card/90 border border-border hover:border-primary/40 hover:shadow-md transition-all group flex flex-col justify-between space-y-3 active:scale-[0.98] disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                          <IconComponent size={16} />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-1.5 py-0.5 rounded bg-muted/60">
                          {prompt.category}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {prompt.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          "{prompt.query}"
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Thinking / Loading Skeleton */}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-1 shadow-sm">
                <Bot size={18} className="animate-spin" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-none p-4 shadow-sm max-w-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles size={14} className="animate-pulse" />
                  <span>{statusText || "Looking up visitor data..."}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-2 bg-muted rounded-full w-48 animate-pulse" />
                  <div className="h-2 bg-muted rounded-full w-36 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 shadow-sm animate-fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold">Execution Error</p>
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Box Area */}
      <div className="border-t border-border bg-card/60 backdrop-blur px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex items-end gap-3 bg-background border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 rounded-2xl p-2.5 shadow-sm transition-all"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the executive assistant (e.g., 'Compare yesterday and today visitors', 'Lobby queue status')..."
              rows={1}
              className="flex-1 bg-transparent resize-none border-none outline-none text-sm placeholder:text-muted-foreground px-2 py-1 max-h-32 min-h-[24px]"
            />

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <span>Send</span>
              <Send size={13} />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Strict RBAC enforcement: queries are isolated to your host permissions</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={11} />
              <span>Press <b>Enter</b> to send, <b>Shift+Enter</b> for new line</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
