import type { ChatMessage, ChatSession, SourceCitation } from '@repeatless/shared';
import { supabase } from '../db/supabase.js';
import { internal, notFound } from '../lib/errors.js';

export async function createSession(userId: string, title: string | null): Promise<ChatSession> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, title })
    .select('id, title, created_at, updated_at')
    .single();
  if (error || !data) throw internal('Failed to create chat session', error);
  return { id: data.id, title: data.title, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function ensureSession(userId: string, sessionId: string | undefined, title: string): Promise<string> {
  if (!sessionId) {
    const session = await createSession(userId, title.slice(0, 80));
    return session.id;
  }
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw internal('Failed to load chat session', error);
  if (!data) throw notFound('Chat session not found');
  return data.id as string;
}

export async function listSessions(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw internal('Failed to list chat sessions', error);
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at }));
}

export async function appendMessage(
  userId: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  citations: SourceCitation[] = [],
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, session_id: sessionId, role, content, citations })
    .select('id, session_id, role, content, citations, created_at')
    .single();
  if (error || !data) throw internal('Failed to append chat message', error);
  // Touch the session so it sorts to the top of the list.
  await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
  return {
    id: data.id,
    sessionId: data.session_id,
    role: data.role,
    content: data.content,
    citations: (data.citations as SourceCitation[]) ?? [],
    createdAt: data.created_at,
  };
}

export async function getRecentMessages(userId: string, sessionId: string, limit = 12): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, session_id, role, content, citations, created_at')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw internal('Failed to load chat history', error);
  // Returned newest-first; reverse to chronological for the model.
  return ((data ?? []) as Array<{
    id: string;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    citations: SourceCitation[];
    created_at: string;
  }>)
    .reverse()
    .map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      citations: r.citations ?? [],
      createdAt: r.created_at,
    }));
}
