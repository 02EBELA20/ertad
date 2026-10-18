import { supabase } from '@/lib/supabase';

export type ConversationItem = {
  id: string;
  other_id: string;
  other_name: string | null;
  other_photo: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type Peer = { other_id: string; other_name: string | null; other_photo: string | null };

export const MAX_MESSAGE = 1000;

export async function startConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { other: otherUserId });
  if (error || !data) throw error ?? new Error('no conversation');
  return data as string;
}

export async function fetchConversations(): Promise<ConversationItem[]> {
  const { data, error } = await supabase.rpc('my_conversations');
  if (error) throw error;
  return (data ?? []) as ConversationItem[];
}

export async function fetchPeer(conversationId: string): Promise<Peer | null> {
  const { data, error } = await supabase.rpc('conversation_peer', { conv: conversationId });
  if (error) throw error;
  return ((data ?? [])[0] as Peer | undefined) ?? null;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at, read_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  // newest first (used with an inverted list)
  return (data ?? []) as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() })
    .select('id, conversation_id, sender_id, body, created_at, read_at')
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markRead(conversationId: string): Promise<void> {
  await supabase.rpc('mark_conversation_read', { conv: conversationId });
}
