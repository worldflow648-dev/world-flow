// Admin-only edge function: permanently delete a merchant account.
// Requires the merchant to be suspended first as a safety guard.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller JWT and resolve user id
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const callerId = claimsData.claims.sub as string;

    // Parse + validate body
    const body = await req.json().catch(() => ({}));
    const merchantId = typeof body?.merchantId === 'string' ? body.merchantId : null;
    if (!merchantId || !/^[0-9a-f-]{36}$/i.test(merchantId)) {
      return json({ error: 'INVALID_MERCHANT_ID' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify caller is an admin
    const { data: isAdmin, error: roleError } = await admin.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    });
    if (roleError || !isAdmin) {
      return json({ error: 'NOT_ADMIN' }, 403);
    }

    // Guard: require merchant suspended before deletion
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, is_suspended')
      .eq('id', merchantId)
      .maybeSingle();
    if (profileError) return json({ error: profileError.message }, 500);
    if (!profile) return json({ error: 'MERCHANT_NOT_FOUND' }, 404);
    if (!profile.is_suspended) return json({ error: 'NOT_SUSPENDED' }, 400);

    // Delete dependent rows first (no FK cascade is guaranteed).
    // Order matters: child rows → wallet → profile → role → auth user.
    await admin.from('wallet_transactions').delete().in(
      'wallet_id',
      (await admin.from('wallets').select('id').eq('merchant_id', merchantId)).data?.map((w) => w.id) ?? [],
    );
    await admin.from('settlement_order_links').delete().in(
      'settlement_id',
      (await admin.from('settlement_receipts').select('id').eq('merchant_id', merchantId)).data?.map((s) => s.id) ?? [],
    );
    await admin.from('settlement_receipts').delete().eq('merchant_id', merchantId);
    await admin.from('settlement_requests').delete().eq('merchant_id', merchantId);
    await admin.from('wallets').delete().eq('merchant_id', merchantId);
    await admin.from('user_roles').delete().eq('user_id', merchantId);
    await admin.from('profiles').delete().eq('id', merchantId);

    // Finally delete the auth user
    const { error: deleteError } = await admin.auth.admin.deleteUser(merchantId);
    if (deleteError) return json({ error: deleteError.message }, 500);

    return json({ ok: true }, 200);
  } catch (err) {
    return json({ error: (err as Error).message || 'UNKNOWN_ERROR' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
