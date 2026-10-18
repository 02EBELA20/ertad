import { supabase } from '@/lib/supabase';
import { CategoryGroup } from '@/lib/categories';

export type BoardPost = {
  id: string;
  author_id: string;
  category_id: string;
  city: string;
  body: string;
  budget_note: string | null;
  created_at: string;
  author_name: string | null;
  author_photo: string | null;
};

export type PostDetail = BoardPost & {
  contact_phone: string | null;
  status: 'open' | 'closed';
  expires_at: string;
};

export type NewPost = {
  categoryId: string;
  city: string;
  body: string;
  budget: string;
  phone: string; // digits with leading +, or ''
};

export async function fetchBoardPosts(categoryIds: string[] | null): Promise<BoardPost[]> {
  const { data, error } = await supabase.rpc('board_posts', { cat_ids: categoryIds });
  if (error) throw error;
  return (data ?? []) as BoardPost[];
}

export async function fetchPost(id: string): Promise<PostDetail | null> {
  const { data, error } = await supabase.rpc('board_post', { pid: id });
  if (error) throw error;
  return ((data ?? [])[0] as PostDetail | undefined) ?? null;
}

export async function createPost(authorId: string, p: NewPost): Promise<string> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: authorId,
      category_id: p.categoryId,
      city: p.city.trim(),
      body: p.body.trim(),
      budget_note: p.budget.trim() || null,
      contact_phone: p.phone || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export type MyPost = {
  id: string;
  category_id: string;
  city: string;
  body: string;
  budget_note: string | null;
  status: 'open' | 'closed';
  expires_at: string;
  created_at: string;
};

export async function fetchMyPosts(authorId: string): Promise<MyPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, category_id, city, body, budget_note, status, expires_at, created_at')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as MyPost[];
}

export async function closePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').update({ status: 'closed' }).eq('id', id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

/** Name, icon slug and the id to use as a filter for any category id. */
export function describeCategory(
  groups: CategoryGroup[],
  id: string,
): { label: string; slug: string } {
  for (const g of groups) {
    if (g.parent.id === id) return { label: g.parent.name_ka, slug: g.parent.slug };
    const c = g.children.find((x) => x.id === id);
    if (c) return { label: `${g.parent.name_ka} · ${c.name_ka}`, slug: g.parent.slug };
  }
  return { label: '', slug: '' };
}

/** "5 წუთის წინ", "2 საათის წინ", "გუშინ", ... */
export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ახლახან';
  if (min < 60) return `${min} წუთის წინ`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} საათის წინ`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'გუშინ';
  return `${d} დღის წინ`;
}

export function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}
