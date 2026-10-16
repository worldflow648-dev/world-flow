import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StaffAdditionItem {
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  size: string;
  color: string | null;
  merchantName: string;
  merchantId: string;
  createdAt: string;
  status: string;
  addons: Array<{
    name: string;
    tag: string | null;
    option?: string;
    price: number;
  }>;
  tags: string[];
}

export const useStaffAdditions = () => {
  return useQuery({
    queryKey: ['staff-additions'],
    queryFn: async () => {
      // Fetch addon tag mapping
      const { data: addons } = await supabase
        .from('product_addons')
        .select('id, name, name_en, tag')
        .eq('is_active', true);

      const addonMap = new Map<string, { name: string; tag: string | null }>();
      addons?.forEach(a => {
        addonMap.set(a.id, { name: a.name, tag: a.tag });
        addonMap.set(a.name, { name: a.name, tag: a.tag });
      });

      // Fetch orders with addons
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, merchant_id, created_at, status')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      const orderIds = orders.map(o => o.id);
      const merchantIds = [...new Set(orders.map(o => o.merchant_id))];

      // Fetch order items with addons and profiles in parallel
      const [itemsRes, profilesRes] = await Promise.all([
        supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', merchantIds),
      ]);

      if (itemsRes.error) throw itemsRes.error;

      const profileMap = new Map<string, string>();
      profilesRes.data?.forEach(p => profileMap.set(p.id, p.full_name));

      const orderMap = new Map(orders.map(o => [o.id, o]));

      const results: StaffAdditionItem[] = [];

      for (const item of itemsRes.data || []) {
        const itemAddons = item.addons as any[];
        if (!itemAddons || !Array.isArray(itemAddons) || itemAddons.length === 0) continue;

        const order = orderMap.get(item.order_id);
        if (!order) continue;

        const resolvedAddons: StaffAdditionItem['addons'] = [];
        const tags: string[] = [];

        for (const addon of itemAddons) {
          const addonKey = addon.addonId || addon.addon_id || addon.id;
          const addonName = addon.addonName || addon.name;
          const addonInfo = addonMap.get(addonKey) || addonMap.get(addonName);
          const tag = addonInfo?.tag || addonName || addonInfo?.name || 'أخرى';
          resolvedAddons.push({
            name: addonName || addonInfo?.name || '',
            tag,
            option: addon.optionName || addon.option_name,
            price: addon.price || 0,
          });
          if (tag && !tags.includes(tag)) tags.push(tag);
        }

        results.push({
          orderId: order.id,
          orderNumber: order.order_number,
          orderItemId: item.id,
          productName: item.product_name,
          productImage: item.product_image,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          merchantName: profileMap.get(order.merchant_id) || '',
          merchantId: order.merchant_id,
          createdAt: order.created_at,
          status: order.status || 'pending',
          addons: resolvedAddons,
          tags,
        });
      }

      return results;
    },
  });
};

export const useAddonTags = () => {
  return useQuery({
    queryKey: ['addon-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_addons')
        .select('id, name, tag')
        .eq('is_active', true);

      if (error) throw error;

      const tags: string[] = [];
      data?.forEach(a => {
        const tag = a.tag || a.name;
        if (tag && !tags.includes(tag)) tags.push(tag);
      });

      return tags;
    },
  });
};
