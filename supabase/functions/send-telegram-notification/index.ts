import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Notification type labels for formatted messages
const NOTIFICATION_TYPES: Record<string, string> = {
  'payment_failure': '❌ Payment Failed',
  'referral_mismatch': '⚠️ Referral Issue',
  'commission_issue': '💰 Commission Alert',
  'premium_unlocked': '🎉 Referral Reward Unlocked',
  'cmo_underperformance': '📊 CMO Target Alert',
  'head_ops_request': '📋 Head of Ops Request',
  'payhere_popup_failed': '🔴 PayHere Popup Failed',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Telegram bot credentials from site_settings
    const { data: telegramSettings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "telegram_settings")
      .single();

    const botToken = telegramSettings?.value?.bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = telegramSettings?.value?.chat_id || Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      console.log("Telegram credentials not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: false, message: "Telegram not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { type, message, data } = body;

    // Format the message
    const typeLabel = NOTIFICATION_TYPES[type] || '📢 Notification';
    let formattedMessage = `${typeLabel}\n\n${message}`;

    // Add additional data if provided
    if (data) {
      formattedMessage += '\n\n📋 Details:';
      for (const [key, value] of Object.entries(data)) {
        formattedMessage += `\n• ${key}: ${value}`;
      }
    }

    formattedMessage += `\n\n🕐 ${new Date().toISOString()}`;

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: "HTML",
      }),
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error("Telegram API error:", telegramResult);
      return new Response(
        JSON.stringify({ success: false, error: telegramResult.description }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Telegram notification sent:", type);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Telegram notification error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
