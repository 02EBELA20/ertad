import { supabase } from '@/lib/supabase';

export type ReviewState = { eligible: boolean; reviewed: boolean };
export type ReviewSummary = { avg: number; cnt: number };
export type ReviewItem = { rating: number; comment: string | null; created_at: string; reviewer_name: string | null };

export async function fetchReviewState(conversationId: string): Promise<ReviewState> {
  const { data, error } = await supabase.rpc('review_state', { conv: conversationId });
  if (error) throw error;
  const row = (data ?? [])[0] as ReviewState | undefined;
  return row ?? { eligible: false, reviewed: false };
}

export async function submitReview(conversationId: string, stars: number, note: string): Promise<void> {
  const { error } = await supabase.rpc('submit_review', {
    conv: conversationId,
    stars,
    note: note.trim().slice(0, 300),
  });
  if (error) throw error;
}

export async function fetchReviewSummary(userId: string): Promise<ReviewSummary | null> {
  const { data, error } = await supabase.rpc('provider_review_summary', { uid: userId });
  if (error) throw error;
  const row = (data ?? [])[0] as { avg: number | string | null; cnt: number } | undefined;
  if (!row || !row.cnt) return null;
  return { avg: Number(row.avg), cnt: row.cnt };
}

export async function fetchReviews(userId: string): Promise<ReviewItem[]> {
  const { data, error } = await supabase.rpc('provider_reviews', { uid: userId });
  if (error) throw error;
  return (data ?? []) as ReviewItem[];
}

export async function fetchSummaries(ids: string[]): Promise<Map<string, ReviewSummary>> {
  const out = new Map<string, ReviewSummary>();
  if (ids.length === 0) return out;
  const { data, error } = await supabase.rpc('review_summaries', { ids });
  if (error) throw error;
  for (const r of (data ?? []) as { user_id: string; avg: number | string; cnt: number }[]) {
    out.set(r.user_id, { avg: Number(r.avg), cnt: r.cnt });
  }
  return out;
}
