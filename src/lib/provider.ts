import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

export type MyProvider = {
  city: string;
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
    .select('city, bio, price_note, contact_phone, license_number, photo_path, visible, allow_feed')
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
export async function saveMyProvider(userId: string, input: ProviderInput): Promise<void> {
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
    city: input.city,
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
