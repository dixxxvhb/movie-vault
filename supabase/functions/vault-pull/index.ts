// vault-pull - returns every data/ file the Vault wall needs, keyed by filename.
// Calls public.vault_pull() with the service role (the RPC is revoked from anon
// and authenticated). scripts/pull.py writes each key to data/<key> verbatim.
// Auth: the cron secret from public.push_secrets, or Dixon's JWT, the same
// pattern as film-enrich. verify_jwt is OFF at the gateway; checked in-function.
// Source of truth: this file, in ~/Code/movie-vault. Deploy through the MCP.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DIXON_EMAIL = "dixon@honeyyy.app";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    let authorized = false;
    const { data: secretRow } = await supabase
      .from("push_secrets")
      .select("value")
      .eq("key", "cron_secret")
      .maybeSingle();
    if (secretRow && bearer === (secretRow as { value: string }).value) {
      authorized = true;
    } else {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await authClient.auth.getUser();
      authorized = userData?.user?.email === DIXON_EMAIL;
    }
    if (!authorized) return json({ error: "forbidden" }, 403);

    const { data, error } = await supabase.rpc("vault_pull");
    if (error) throw new Error(error.message);
    return json({ pulled_at: new Date().toISOString(), files: data });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
