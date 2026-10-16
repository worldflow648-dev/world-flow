import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AddonScope {
  id: string;
  addon_id: string;
  scope_type: 'category' | 'product';
  category_id: string | null;
  product_id: string | null;
  price_override: number | null;
  wholesale_price_override: number | null;
  deposit_price_override: number | null;
}

export const useAllAddonScopes = () => {
  return useQuery({
    queryKey: ['addon-scopes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('addon_scopes').select('*');
      if (error) throw error;
      return (data || []) as AddonScope[];
    },
  });
};

export const useAddonScopes = (addonId: string | null) => {
  return useQuery({
    queryKey: ['addon-scopes', addonId],
    queryFn: async () => {
      if (!addonId) return [];
      const { data, error } = await supabase
        .from('addon_scopes')
        .select('*')
        .eq('addon_id', addonId);
      if (error) throw error;
      return (data || []) as AddonScope[];
    },
    enabled: !!addonId,
  });
};

export interface SaveScopesPayload {
  addonId: string;
  scopes: Array<{
    scope_type: 'category' | 'product';
    category_id?: string | null;
    product_id?: string | null;
    price_override?: number | null;
    wholesale_price_override?: number | null;
    deposit_price_override?: number | null;
  }>;
}

export const useReplaceAddonScopes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ addonId, scopes }: SaveScopesPayload) => {
      // Replace strategy: delete existing then insert.
      const { error: delErr } = await supabase
        .from('addon_scopes')
        .delete()
        .eq('addon_id', addonId);
      if (delErr) throw delErr;
      if (scopes.length === 0) return;
      const rows = scopes.map((s) => ({
        addon_id: addonId,
        scope_type: s.scope_type,
        category_id: s.scope_type === 'category' ? s.category_id ?? null : null,
        product_id: s.scope_type === 'product' ? s.product_id ?? null : null,
        price_override: s.price_override ?? null,
        wholesale_price_override: s.wholesale_price_override ?? null,
        deposit_price_override: s.deposit_price_override ?? null,
      }));
      const { error } = await supabase.from('addon_scopes').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addon-scopes'] });
      qc.invalidateQueries({ queryKey: ['admin-addons'] });
      qc.invalidateQueries({ queryKey: ['product-addons'] });
    },
  });
};

/**
 * Sync product-level addon assignments.
 * For each addon in `addonIds` that has scope rows, ensure exactly one
 * product-scope row exists for this product. Remove product-scope rows for
 * addons that have scope rows but are NOT in `addonIds`. Never touches general
 * addons (addons with zero scope rows) — those apply to every product and are
 * managed from the Addons admin page.
 */
export const useSyncProductAddonScopes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, addonIds }: { productId: string; addonIds: string[] }) => {
      // Fetch all scope rows so we know which addons are scoped vs general
      const { data: allScopes, error: scopesErr } = await supabase
        .from('addon_scopes')
        .select('addon_id, product_id, scope_type');
      if (scopesErr) throw scopesErr;

      const scopedAddonIds = new Set<string>();
      const productRowsByAddon = new Map<string, boolean>();
      for (const s of (allScopes || [])) {
        scopedAddonIds.add(s.addon_id);
        if (s.scope_type === 'product' && s.product_id === productId) {
          productRowsByAddon.set(s.addon_id, true);
        }
      }

      const desired = new Set(addonIds);

      // Inserts: scoped addon checked but no product row for this product
      const toInsert: Array<{ addon_id: string; scope_type: 'product'; product_id: string }> = [];
      for (const addonId of desired) {
        if (scopedAddonIds.has(addonId) && !productRowsByAddon.get(addonId)) {
          toInsert.push({ addon_id: addonId, scope_type: 'product', product_id: productId });
        }
      }

      // Deletes: scoped addon NOT checked but has product row for this product
      const toDelete: string[] = [];
      for (const addonId of productRowsByAddon.keys()) {
        if (!desired.has(addonId)) toDelete.push(addonId);
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('addon_scopes').insert(toInsert);
        if (error) throw error;
      }
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('addon_scopes')
          .delete()
          .eq('product_id', productId)
          .in('addon_id', toDelete);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addon-scopes'] });
      qc.invalidateQueries({ queryKey: ['admin-addons'] });
      qc.invalidateQueries({ queryKey: ['product-addons'] });
    },
  });
};

/**
 * Filter addons for a given product and apply scope-based price overrides.
 * - Addons with no scope rows: shown to every product (general).
 * - Otherwise: shown only if product matches a scope row by product_id or category_id.
 *   Product-scope override takes precedence over category-scope.
 */
export function resolveAddonsForProduct<T extends { id: string; price: number; deposit_price?: number | null }>(
  addons: T[],
  scopes: AddonScope[],
  productId: string,
  categoryId: string | null,
): T[] {
  const byAddon = new Map<string, AddonScope[]>();
  for (const s of scopes) {
    if (!byAddon.has(s.addon_id)) byAddon.set(s.addon_id, []);
    byAddon.get(s.addon_id)!.push(s);
  }
  const out: T[] = [];
  for (const addon of addons) {
    const list = byAddon.get(addon.id);
    if (!list || list.length === 0) {
      out.push(addon);
      continue;
    }
    const productMatch = list.find((s) => s.product_id === productId);
    const categoryMatch = categoryId ? list.find((s) => s.category_id === categoryId) : undefined;
    const match = productMatch || categoryMatch;
    if (!match) continue;
    out.push({
      ...addon,
      price: match.price_override ?? addon.price,
      deposit_price: match.deposit_price_override ?? addon.deposit_price ?? null,
    });
  }
  return out;
}
