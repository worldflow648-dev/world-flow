// Auto-expire pending order_returns once their deadline has passed.
// Triggered hourly by a pg_cron job. For each expired return:
//   1. If wholesale not yet settled and order has a positive wholesale cost,
//      call charge_merchant_wholesale (debits the merchant wallet).
//   2. Flip the return's status to 'expired'.
//
// Auth: this function is invoked unattended by cron, so we don't validate
// JWTs. It uses the service-role key internally; no sensitive data is
// returned in the response.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingReturnRow {
  id: string;
  order_id: string;
  wholesale_settled: boolean;
  orders: { total_wholesale_cost: number | null } | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Find all pending returns whose deadline has passed.
  const { data: pending, error: fetchError } = await admin
    .from('order_returns')
    .select('id, order_id, wholesale_settled, orders!inner(total_wholesale_cost)')
    .eq('status', 'pending')
    .lte('deadline_at', new Date().toISOString());

  if (fetchError) {
    console.error('Failed to fetch pending returns', fetchError);
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const rows = (pending ?? []) as unknown as PendingReturnRow[];
  let processed = 0;
  let charged = 0;
  let skipped = 0;
  const errors: Array<{ return_id: string; error: string }> = [];

  for (const row of rows) {
    processed += 1;
    const wholesaleCost = Number(row.orders?.total_wholesale_cost ?? 0);
    const shouldCharge = !row.wholesale_settled && wholesaleCost > 0;

    if (shouldCharge) {
      const { error: chargeError } = await admin.rpc('charge_merchant_wholesale', {
        p_return_id: row.id,
        p_reason: 'expired',
      });
      if (chargeError) {
        errors.push({ return_id: row.id, error: chargeError.message });
        continue; // Don't flip status if the charge failed; we'll retry next hour.
      }
      charged += 1;
    } else {
      skipped += 1;
    }

    const { error: updateError } = await admin
      .from('order_returns')
      .update({ status: 'expired' })
      .eq('id', row.id);

    if (updateError) {
      errors.push({ return_id: row.id, error: updateError.message });
    }
  }

  return new Response(
    JSON.stringify({ processed, charged, skipped, errors }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
