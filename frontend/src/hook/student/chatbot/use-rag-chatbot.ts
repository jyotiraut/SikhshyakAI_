import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

// ── Types ──────────────────────────────────────────────────────────

export interface ChatSession {
  _id: string;
  user_id: string;
  unit_id: string;
  title: string;
  status: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  _id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  used_chunks?: number[];
  relevance_score?: number;
  response_time_ms?: number;
  created_at: string;
}

export interface SessionWithMessages {
  session: ChatSession;
  messages: ChatMessage[];
}

// ── Create Session ─────────────────────────────────────────────────

interface CreateSessionResponse {
  status: string;
  data: {
    session_id: string;
    unit_id: string;
    user_id: string;
    created_at: string;
  };
}

const createSession = async (unitId: string) => {
  const { data } = await axios.post<CreateSessionResponse>(`/rag/sessions/${unitId}`);
  return data.data;
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSession,
    onSuccess: (_data, unitId) => {
      queryClient.invalidateQueries({ queryKey: ['rag-sessions', unitId] });
    },
  });
};

// ── Get Sessions for a Unit ────────────────────────────────────────

interface GetSessionsResponse {
  status: string;
  data: ChatSession[];
}

const getSessions = async (unitId: string): Promise<ChatSession[]> => {
  const { data } = await axios.get<GetSessionsResponse>(`/rag/sessions?unit_id=${unitId}`);
  return data.data;
};

export const useGetSessions = (unitId: string) => {
  return useQuery({
    queryKey: ['rag-sessions', unitId],
    queryFn: () => getSessions(unitId),
    enabled: !!unitId,
  });
};

// ── Get Session Messages ───────────────────────────────────────────

interface GetSessionMessagesResponse {
  status: string;
  data: SessionWithMessages;
}

const getSessionMessages = async (sessionId: string): Promise<SessionWithMessages> => {
  const { data } = await axios.get<GetSessionMessagesResponse>(`/rag/sessions/${sessionId}`);
  return data.data;
};

export const useGetSessionMessages = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['rag-session-messages', sessionId],
    queryFn: () => getSessionMessages(sessionId!),
    enabled: !!sessionId,
  });
};

// ── Chat with Document ─────────────────────────────────────────────

interface ChatRequest {
  unitId: string;
  message: string;
  sessionId: string;
}

interface ChatResponseData {
  success: boolean;
  message: string;
  session_id: string;
  relevance_score: number;
  response_time_ms: number;
  used_chunks: number[];
}

interface ChatApiResponse {
  status: string;
  data: ChatResponseData;
}

const chatWithDocument = async ({ unitId, message, sessionId }: ChatRequest): Promise<ChatResponseData> => {
  const { data } = await axios.post<ChatApiResponse>(`/rag/chat/${unitId}`, {
    message,
    session_id: sessionId,
  });
  return data.data;
};

export const useChatWithDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatWithDocument,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rag-session-messages', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['rag-sessions', variables.unitId] });
    },
  });
};

// ── Delete Session ─────────────────────────────────────────────────

const deleteSession = async (sessionId: string): Promise<void> => {
  await axios.delete(`/rag/sessions/${sessionId}`);
};

export const useDeleteSession = (unitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-sessions', unitId] });
    },
  });
};
