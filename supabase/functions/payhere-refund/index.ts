import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RefundRequest {
  payment_id: string;
  description: string;
  otp_code: string;
  admin_user_id: string;
}

// PayHere API endpoints (will be set dynamically based on mode)
const PAYHERE_LIVE_REFUND_API = "https://www.payhere.lk/merchant/v1/payment/refund";
const PAYHERE_SANDBOX_REFUND_API = "https://sandbox.payhere.lk/merchant/v1/payment/refund";
const PAYHERE_LIVE_TOKEN_API = "https://www.payhere.lk/merchant/v1/oauth/token";
const PAYHERE_SANDBOX_TOKEN_API = "https://sandbox.payhere.lk/merchant/v1/oauth/token";

// Cache for OAuth token
let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(appId: string, appSecret: string, tokenApi: string): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    console.log("Using cached access token");
    return cachedToken.access_token;
  }

  console.log("Fetching new access token from PayHere");

  // Create Base64 encoded authorization string
  const authString = btoa(`${appId}:${appSecret}`);

  const response = await fetch(tokenApi, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get PayHere access token:", errorText);
    throw new Error("Failed to authenticate with PayHere API");
  }

  const data = await response.json();
  
  // Cache the token (expires_in is in seconds, subtract 60 seconds for safety)
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  console.log("Successfully obtained new access token");
  return data.access_token;
}

async function processRefund(
  accessToken: string,
  paymentId: string,
  description: string,
  refundApi: string
): Promise<{ success: boolean; message: string; data?: any }> {
  console.log("Processing refund for payment:", paymentId);

  const response = await fetch(refundApi, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payment_id: paymentId,
      description: description,
    }),
  });

  const data = await response.json();
  console.log("PayHere refund response:", data);

  if (!response.ok) {
    return {
      success: false,
      message: data.message || data.error || "Refund request failed",
      data,
    };
  }

  // PayHere returns status 1 for success
  if (data.status === 1) {
    return {
      success: true,
      message: "Refund processed successfully",
      data,
    };
  }

  return {
    success: false,
    message: data.message || "Refund request was not successful",
    data,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const refundOtpCode = Deno.env.get("REFUND_OTP_CODE") || "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch payment mode from site_settings
  let paymentMode = { mode: "test", test_environment: "web" };
  try {
    const { data: modeData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "payment_mode")
      .maybeSingle();
    
    if (modeData?.value && typeof modeData.value === "object") {
      paymentMode = modeData.value as { mode: string; test_environment: string };
    }
  } catch (err) {
    console.error("Failed to fetch payment mode, using default (test/web):", err);
  }

  // Select credentials and APIs based on payment mode
  let payHereAppId: string;
  let payHereAppSecret: string;
  let tokenApi: string;
  let refundApi: string;

  if (paymentMode.mode === "live") {
    payHereAppId = Deno.env.get("PAYHERE_APP_ID") || "";
    payHereAppSecret = Deno.env.get("PAYHERE_APP_SECRET") || "";
    tokenApi = PAYHERE_LIVE_TOKEN_API;
    refundApi = PAYHERE_LIVE_REFUND_API;
    console.log("Using LIVE mode credentials for refund");
  } else {
    payHereAppId = Deno.env.get("PAYHERE_SANDBOX_APP_ID") || "";
    payHereAppSecret = Deno.env.get("PAYHERE_SANDBOX_APP_SECRET") || "";
    tokenApi = PAYHERE_SANDBOX_TOKEN_API;
    refundApi = PAYHERE_SANDBOX_REFUND_API;
    console.log("Using TEST mode credentials for refund");
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RefundRequest = await req.json();
    const { payment_id, description, otp_code, admin_user_id } = body;

    console.log("Refund request received:", { payment_id, description, admin_user_id });

    // Validate required fields
    if (!payment_id || !otp_code || !admin_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP code
    if (otp_code !== refundOtpCode) {
      console.log("Invalid OTP code provided");
      return new Response(
        JSON.stringify({ error: "Invalid OTP code" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin user has admin role
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", admin_user_id);

    if (rolesError || !adminRoles) {
      console.error("Failed to verify admin roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = adminRoles.some((r) =>
      ["admin", "super_admin", "content_admin", "support_admin"].includes(r.role)
    );

    if (!isAdmin) {
      console.log("User is not an admin");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_id", payment_id)
      .maybeSingle();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already refunded
    if (payment.refund_status === "refunded") {
      return new Response(
        JSON.stringify({ error: "Payment has already been refunded" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if payment was completed
    if (payment.status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Only completed payments can be refunded" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check PayHere credentials
    if (!payHereAppId || !payHereAppSecret) {
      console.error("PayHere API credentials not configured");
      return new Response(
        JSON.stringify({ error: "PayHere API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(payHereAppId, payHereAppSecret, tokenApi);
    } catch (tokenError) {
      console.error("Failed to get access token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with PayHere" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process refund
    const refundResult = await processRefund(
      accessToken,
      payment_id,
      description || `Refund for order ${payment.order_id}`,
      refundApi
    );

    if (!refundResult.success) {
      console.error("Refund failed:", refundResult.message);
      return new Response(
        JSON.stringify({ 
          error: refundResult.message,
          details: refundResult.data 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment record with refund status
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        refund_status: "refunded",
        refunded_at: new Date().toISOString(),
        refunded_by: admin_user_id,
        refund_amount: payment.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("payment_id", payment_id);

    if (updateError) {
      console.error("Failed to update payment record:", updateError);
      // Still return success since the refund was processed
    }

    // If there's an enrollment, mark it as inactive
    if (payment.enrollment_id) {
      const { error: enrollmentError } = await supabase
        .from("enrollments")
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.enrollment_id);

      if (enrollmentError) {
        console.error("Failed to deactivate enrollment:", enrollmentError);
      }
    }

    console.log("Refund processed successfully for payment:", payment_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Refund processed successfully",
        payment_id,
        refund_amount: payment.amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in payhere-refund function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});