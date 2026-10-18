import { supabase } from '@/lib/supabase';

export type ConversationItem = {
  id: string;
  other_id: string;
  other_name: string | null;
  other_photo: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
  i_blocked: boolean;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type Peer = {
  other_id: string;
  other_name: string | null;
  other_photo: string | null;
  i_blocked: boolean;
};

export const MAX_MESSAGE = 1000;

export async function startConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { other: otherUserId });
  if (error || !data) throw error ?? new Error('no conversation');
  return data as string;
}

export async function fetchConversations(): Promise<ConversationItem[]> {
  const { data, error } = await supabase.rpc('my_chats');
  if (error) throw error;
  return (data ?? []) as ConversationItem[];
}

export async function fetchPeer(conversationId: string): Promise<Peer | null> {
  const { data, error } = await supabase.rpc('chat_peer', { conv: conversationId });
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

export async function blockUser(me: string, other: string): Promise<void> {
  const { error } = await supabase.from('blocks').insert({ blocker_id: me, blocked_id: other });
  // already blocked (duplicate key) is fine
  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(me: string, other: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', other);
  if (error) throw error;
}

export type ReportReason = 'spam' | 'abuse' | 'scam' | 'fake' | 'other';

export async function reportUser(input: {
  reporterId: string;
  targetUserId: string;
  conversationId?: string | null;
  postId?: string | null;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    target_user_id: input.targetUserId,
    conversation_id: input.conversationId ?? null,
    post_id: input.postId ?? null,
    reason: input.reason,
    details: input.details?.trim() ? input.details.trim().slice(0, 500) : null,
  });
  if (error) throw error;
}
