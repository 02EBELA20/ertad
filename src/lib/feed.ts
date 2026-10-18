import { supabase } from '@/lib/supabase';

export type FeedItem = {
  kind: 'offer' | 'seek';
  ref_id: string;
  title: string | null;
  category_id: string | null;
  city: string;
  photo: string | null;
  snippet: string | null;
  is_demo: boolean;
};

/** A fair, random set of members/requests from the user's own city. Empty until the city is big enough. */
export async function fetchHomeFeed(limit = 6): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('home_feed', { lim: limit });
  if (error) throw error;
  return (data ?? []) as FeedItem[];
}
