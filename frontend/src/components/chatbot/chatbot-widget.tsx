import { format } from 'date-fns';
import { ArrowLeft, Bot, Loader2, MessageCircle, MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  type ChatMessage,
  useChatWithDocument,
  useCreateSession,
  useDeleteSession,
  useGetSessionMessages,
  useGetSessions,
} from '@/hook/student/chatbot/use-rag-chatbot';

interface ChatbotWidgetProps {
  unitId: string;
  unitTitle: string;
}

export function ChatbotWidget({ unitId, unitTitle }: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: sessions, isLoading: sessionsLoading } = useGetSessions(unitId);
  const { data: sessionData, isLoading: messagesLoading } = useGetSessionMessages(activeSessionId);

  // Mutations
  const createSession = useCreateSession();
  const chatMutation = useChatWithDocument();
  const deleteSession = useDeleteSession(unitId);

  // Merge server messages with optimistic messages
  const allMessages = (() => {
    const serverMessages = sessionData?.messages ?? [];
    // Only include optimistic messages that aren't already in server messages
    const serverIds = new Set(serverMessages.map((m) => m._id));
    const pending = optimisticMessages.filter((m) => !serverIds.has(m._id));
    return [...serverMessages, ...pending];
  })();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Focus input when session changes
  useEffect(() => {
    if (activeSessionId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeSessionId]);

  // Clear optimistic messages when server data updates
  useEffect(() => {
    if (sessionData?.messages) {
      setOptimisticMessages([]);
    }
  }, [sessionData?.messages]);

  const handleCreateSession = async () => {
    try {
      const result = await createSession.mutateAsync(unitId);
      setActiveSessionId(result.session_id);
      setOptimisticMessages([]);
    } catch {
      toast.error('Failed to create chat session');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !activeSessionId) return;

    // Add optimistic user message
    const optimisticUserMsg: ChatMessage = {
      _id: `optimistic-user-${Date.now()}`,
      session_id: activeSessionId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setOptimisticMessages((prev) => [...prev, optimisticUserMsg]);
    setMessage('');

    try {
      const response = await chatMutation.mutateAsync({
        unitId,
        message: trimmed,
        sessionId: activeSessionId,
      });

      // Add optimistic assistant response
      const optimisticAssistantMsg: ChatMessage = {
        _id: `optimistic-assistant-${Date.now()}`,
        session_id: activeSessionId,
        role: 'assistant',
        content: response.message,
        relevance_score: response.relevance_score,
        response_time_ms: response.response_time_ms,
        used_chunks: response.used_chunks,
        created_at: new Date().toISOString(),
      };
      setOptimisticMessages((prev) => [...prev, optimisticAssistantMsg]);
    } catch {
      toast.error('Failed to send message');
      // Remove the optimistic user message on error
      setOptimisticMessages((prev) => prev.filter((m) => m._id !== optimisticUserMsg._id));
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession.mutateAsync(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setOptimisticMessages([]);
      }
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const handleBack = () => {
    setActiveSessionId(null);
    setOptimisticMessages([]);
  };

  return (
    <>
      <Button
        variant='outline'
        size='sm'
        onClick={() => setOpen(true)}
        className='gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 hover:text-violet-800'
      >
        <Bot className='w-4 h-4' />
        <span>Ask AI</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side='right' className='w-full sm:max-w-lg flex flex-col p-0 gap-0'>
          {/* Header */}
          <SheetHeader className='border-b px-4 py-3 shrink-0'>
            <div className='flex items-center gap-3'>
              {activeSessionId && (
                <Button variant='ghost' size='icon-sm' onClick={handleBack}>
                  <ArrowLeft className='w-4 h-4' />
                </Button>
              )}
              <div className='flex-1 min-w-0'>
                <SheetTitle className='text-base truncate flex items-center gap-2'>
                  <Sparkles className='w-4 h-4 text-violet-600 shrink-0' />
                  AI Study Assistant
                </SheetTitle>
                <SheetDescription className='text-xs truncate'>
                  {activeSessionId ? (sessionData?.session?.title ?? 'Chat') : `Ask questions about "${unitTitle}"`}
                </SheetDescription>
              </div>
              {!activeSessionId && (
                <Button
                  size='sm'
                  variant='default'
                  onClick={handleCreateSession}
                  disabled={createSession.isPending}
                  className='gap-1.5 shrink-0'
                >
                  {createSession.isPending ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <MessageSquarePlus className='w-3.5 h-3.5' />
                  )}
                  New Chat
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Body */}
          {!activeSessionId ? (
            // ── Session List View ──
            <div className='flex-1 overflow-y-auto'>
              {sessionsLoading ? (
                <div className='flex items-center justify-center h-40'>
                  <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
                </div>
              ) : !sessions || sessions.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full gap-4 p-8 text-center'>
                  <div className='w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center'>
                    <MessageCircle className='w-8 h-8 text-violet-600' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-gray-900 mb-1'>No conversations yet</h3>
                    <p className='text-sm text-muted-foreground'>
                      Start a new chat to ask questions about the study material in this unit.
                    </p>
                  </div>
                  <Button onClick={handleCreateSession} disabled={createSession.isPending} className='gap-2'>
                    {createSession.isPending ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <MessageSquarePlus className='w-4 h-4' />
                    )}
                    Start New Chat
                  </Button>
                </div>
              ) : (
                <div className='divide-y'>
                  {sessions.map((session) => (
                    <div
                      key={session._id}
                      className='flex items-center gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors group'
                      onClick={() => {
                        setActiveSessionId(session._id);
                        setOptimisticMessages([]);
                      }}
                    >
                      <div className='w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0'>
                        <MessageCircle className='w-4 h-4 text-violet-600' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>
                          {session.title || 'New Chat Session'}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {session.message_count} message{session.message_count !== 1 ? 's' : ''} ·{' '}
                          {format(new Date(session.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        className='opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session._id);
                        }}
                        disabled={deleteSession.isPending}
                      >
                        {deleteSession.isPending ? (
                          <Loader2 className='w-3.5 h-3.5 animate-spin' />
                        ) : (
                          <Trash2 className='w-3.5 h-3.5' />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // ── Chat View ──
            <>
              {/* Messages */}
              <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4'>
                {messagesLoading ? (
                  <div className='flex items-center justify-center h-40'>
                    <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
                  </div>
                ) : allMessages.length === 0 && !chatMutation.isPending ? (
                  <div className='flex flex-col items-center justify-center h-full gap-3 text-center px-4'>
                    <div className='w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center'>
                      <Sparkles className='w-7 h-7 text-violet-600' />
                    </div>
                    <div>
                      <h3 className='font-semibold text-gray-900 mb-1'>Ask anything</h3>
                      <p className='text-sm text-muted-foreground'>
                        Ask questions about the uploaded study material for this unit.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {allMessages.map((msg) => (
                      <MessageBubble key={msg._id} message={msg} />
                    ))}
                    {chatMutation.isPending && (
                      <div className='flex items-start gap-3'>
                        <div className='w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0'>
                          <Bot className='w-4 h-4 text-violet-600' />
                        </div>
                        <div className='bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]'>
                          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <Loader2 className='w-3.5 h-3.5 animate-spin' />
                            Thinking...
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className='border-t px-4 py-3 shrink-0'>
                <form onSubmit={handleSendMessage} className='flex gap-2'>
                  <Input
                    ref={inputRef}
                    placeholder='Ask a question about this unit...'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={chatMutation.isPending}
                    className='flex-1'
                    autoComplete='off'
                  />
                  <Button
                    type='submit'
                    size='icon'
                    disabled={!message.trim() || chatMutation.isPending}
                    className='shrink-0'
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Send className='w-4 h-4' />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── Message Bubble Component ───────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-violet-100'
        }`}
      >
        {isUser ? <span className='text-xs font-semibold'>You</span> : <Bot className='w-4 h-4 text-violet-600' />}
      </div>
      <div
        className={`rounded-2xl px-4 py-3 max-w-[85%] ${
          isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
        }`}
      >
        <p className='text-sm whitespace-pre-wrap leading-relaxed'>{message.content}</p>
        {!isUser && message.response_time_ms != null && (
          <p className='text-[10px] mt-2 opacity-60'>{(message.response_time_ms / 1000).toFixed(1)}s</p>
        )}
      </div>
    </div>
  );
}
