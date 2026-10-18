import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

export type BusinessInfo = {
  is_business: boolean;
  business_name: string | null;
  business_address: string | null;
  business_website: string | null;
  business_hours: string | null;
};

export type MyProvider = BusinessInfo & {
  city: string;
  state: string;
  online: boolean;
  bio: string;
  price_note: string | null;
  contact_phone: string;
  license_number: string | null;
  photo_path: string | null;
  visible: boolean;
  allow_feed: boolean;
  categoryIds: string[];
};

// Professions where we ask for a license number and show a notice.
export const LICENSED_SLUGS = [
  'health--doctor',
  'health--dentist',
  'legal--lawyer',
  'legal--accountant',
  'repair--plumbing',
  'repair--electric',
];

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function fetchMyProvider(userId: string): Promise<MyProvider | null> {
  const { data, error } = await supabase
    .from('providers')
    .select(
      'city, state, online, bio, price_note, contact_phone, license_number, photo_path, visible, allow_feed, is_business, business_name, business_address, business_website, business_hours',
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cats = await supabase.from('provider_categories').select('category_id').eq('user_id', userId);
  if (cats.error) throw cats.error;
  return { ...data, categoryIds: (cats.data ?? []).map((c) => c.category_id as string) };
}

export type ProviderInput = Omit<MyProvider, 'photo_path'> & {
  /** local uri of a newly picked photo, if any */
  newPhotoUri?: string | null;
  newPhotoMime?: string | null;
  /** existing stored path to keep (null removes the photo) */
  keepPhotoPath: string | null;
};

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Creates or updates the signed-in user's specialist profile. Throws on failure. */
export async function saveMyProvider(userId: string, displayName: string, input: ProviderInput): Promise<void> {
  let photoPath = input.keepPhotoPath;
  let oldToRemove: string | null = null;

  if (input.newPhotoUri) {
    const mime = ALLOWED_MIME.includes(input.newPhotoMime ?? '') ? (input.newPhotoMime as string) : 'image/jpeg';
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const body = await (await fetch(input.newPhotoUri)).arrayBuffer();
    const path = `${userId}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from('avatars').upload(path, body, { contentType: mime, upsert: false });
    if (up.error) throw up.error;
    oldToRemove = input.keepPhotoPath;
    photoPath = path;
  }

  const existing = await supabase.from('providers').select('photo_path').eq('user_id', userId).maybeSingle();
  if (existing.error) throw existing.error;
  const previousPath = existing.data?.photo_path ?? null;

  const fields = {
    display_name: displayName.slice(0, 60),
    city: input.city,
    state: input.state,
    online: input.online,
    is_business: input.is_business,
    business_name: input.is_business ? input.business_name : null,
    business_address: input.is_business ? input.business_address : null,
    business_website: input.is_business ? input.business_website : null,
    business_hours: input.is_business ? input.business_hours : null,
    bio: input.bio,
    price_note: input.price_note,
    contact_phone: input.contact_phone,
    license_number: input.license_number,
    photo_path: photoPath,
    visible: input.visible,
    allow_feed: input.allow_feed,
  };

  if (existing.data) {
    const { error } = await supabase.from('providers').update(fields).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('providers').insert({ user_id: userId, ...fields });
    if (error) throw error;
  }

  const del = await supabase.from('provider_categories').delete().eq('user_id', userId);
  if (del.error) throw del.error;
  const ins = await supabase
    .from('provider_categories')
    .insert(input.categoryIds.map((category_id) => ({ user_id: userId, category_id })));
  if (ins.error) throw ins.error;

  // Best effort: clean up photos that are no longer referenced.
  const stale = [oldToRemove, previousPath].filter((p): p is string => !!p && p !== photoPath);
  if (stale.length > 0) await supabase.storage.from('avatars').remove(stale);
}

export function useMyProvider(userId: string | undefined) {
  const [provider, setProvider] = useState<MyProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) return;
    setError(false);
    try {
      setProvider(await fetchMyProvider(userId));
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { provider, loading, error, reload };
}

export type ProviderListItem = {
  user_id: string;
  display_name: string;
  city: string;
  state: string;
  online: boolean;
  is_business: boolean;
  business_name: string | null;
  bio: string;
  price_note: string | null;
  photo_path: string | null;
  is_demo: boolean;
  categoryIds: string[];
};

/** Fisher-Yates: nobody is pushed up or hidden, order is random on every load. */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Visible providers, optionally limited to category ids and to one state (online providers always match). */
export async function fetchProviders(categoryIds: string[] | null, state: string | null = null): Promise<ProviderListItem[]> {
  const embed = categoryIds ? 'provider_categories!inner(category_id)' : 'provider_categories(category_id)';
  let q = supabase
    .from('providers')
    .select(`user_id, display_name, city, state, online, is_business, business_name, bio, price_note, photo_path, is_demo, ${embed}`)
    .limit(60);
  if (categoryIds) q = q.in('provider_categories.category_id', categoryIds);
  if (state) q = q.or(`state.eq.${state},online.eq.true`);
  const { data, error } = await q;
  if (error) throw error;
  type Row = Omit<ProviderListItem, 'categoryIds'> & { provider_categories: { category_id: string }[] };
  return shuffle(
    ((data ?? []) as unknown as Row[]).map(({ provider_categories, ...rest }) => ({
      ...rest,
      categoryIds: provider_categories.map((c) => c.category_id),
    })),
  );
}

export type ProviderDetail = ProviderListItem & BusinessInfo & {
  contact_phone: string;
  license_number: string | null;
};

export async function fetchProvider(userId: string): Promise<ProviderDetail | null> {
  const { data, error } = await supabase
    .from('providers')
    .select(
      'user_id, display_name, city, state, online, is_business, business_name, business_address, business_website, business_hours, bio, price_note, photo_path, is_demo, contact_phone, license_number, provider_categories(category_id)',
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { provider_categories, ...rest } = data as unknown as Omit<ProviderDetail, 'categoryIds'> & {
    provider_categories: { category_id: string }[];
  };
  return { ...rest, categoryIds: provider_categories.map((c) => c.category_id) };
}
