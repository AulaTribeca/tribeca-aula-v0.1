// Tribeca Aula · versión 58
// Edge Function para enviar los emails pendientes de public.email_outbox mediante Resend.
// Secrets necesarios:
//   RESEND_API_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//   TRIBECA_EMAIL_FROM, por ejemplo: "Tribeca Aula <notificaciones@tudominio.com>"

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("TRIBECA_EMAIL_FROM") || "Tribeca Aula <notificaciones@example.com>";

  if (!supabaseUrl || !serviceRole || !resendKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const { data: rows, error } = await supabase
    .from("email_outbox")
    .select("id, recipient_email, subject, body")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let sent = 0;
  let failed = 0;

  for (const row of rows || []) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [row.recipient_email],
          subject: row.subject,
          text: row.body,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Resend error ${response.status}`);
      }

      await supabase.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("id", row.id);
      sent++;
    } catch (e) {
      failed++;
      await supabase.from("email_outbox").update({ status: "error", error: String(e?.message || e) }).eq("id", row.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, pending_read: rows?.length || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
