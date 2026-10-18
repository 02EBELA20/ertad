import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Category = {
  id: string;
  parent_id: string | null;
  slug: string;
  name_ka: string;
  sort_order: number;
};

export type CategoryGroup = { parent: Category; children: Category[] };

let cache: CategoryGroup[] | null = null;

function group(rows: Category[]): CategoryGroup[] {
  const parents = rows.filter((c) => c.parent_id === null);
  return parents.map((parent) => ({
    parent,
    children: rows.filter((c) => c.parent_id === parent.id),
  }));
}

export function useCategories() {
  const [groups, setGroups] = useState<CategoryGroup[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('categories')
      .select('id, parent_id, slug, name_ka, sort_order')
      .order('sort_order');
    if (err || !data) {
      setError(true);
    } else {
      cache = group(data as Category[]);
      setGroups(cache);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (cache === null) load();
  }, [load]);

  return { groups, loading, error, reload: load };
}
