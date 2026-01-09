import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  order_id: string;
  items: string;
  amount: number;
  currency: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  custom_1?: string; // tier type
  custom_2?: string; // enrollment_id or 'new'
  ref_creator?: string; // referral code
  discount_code?: string; // discount code
}

// PayHere status code to failure reason mapping
const FAILURE_REASONS: Record<string, string> = {
  "-1": "Payment was cancelled",
  "-2": "Payment failed - Your card was declined",
  "-3": "Payment was charged back",
};

// Common card decline reasons from PayHere
const DECLINE_REASONS: Record<string, string> = {
  "insufficient_funds": "Your card has insufficient funds. Please try a different payment method.",
  "card_declined": "Your bank declined this transaction. Please try a different card.",
  "do_not_honor": "Your bank declined this transaction. Please contact your bank.",
  "limit_exceeded": "Your card limit has been exceeded. Please contact your bank.",
  "expired_card": "Your card has expired. Please use a different card.",
  "invalid_card": "Invalid card details. Please check and try again.",
  "network_error": "A network error occurred. Please try again.",
};

function md5(input: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  // Simple MD5 implementation for Deno
  function rotateLeft(x: number, n: number): number {
    return (x << n) | (x >>> (32 - n));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function F(x: number, y: number, z: number): number { return (x & y) | ((~x) & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & (~z)); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | (~z)); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: Uint8Array): number[] {
    const lWordCount = (((str.length + 8) - ((str.length + 8) % 64)) / 64 + 1) * 16;
    const lWordArray: number[] = Array(lWordCount - 1).fill(0);
    let lByteCount = 0;
    let lWordPosition = 0;

    while (lByteCount < str.length) {
      lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
      const lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordPosition] = (lWordArray[lWordPosition] | (str[lByteCount] << lBytePosition));
      lByteCount++;
    }

    lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
    const lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordPosition] = lWordArray[lWordPosition] | (0x80 << lBytePosition);
    lWordArray[lWordCount - 2] = str.length << 3;
    lWordArray[lWordCount - 1] = str.length >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue: number): string {
    let result = "";
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      result += ("0" + lByte.toString(16)).slice(-2);
    }
    return result;
  }

  const x = convertToWordArray(data);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toUpperCase();
}

function generateHash(merchantId: string, orderId: string, amount: number, currency: string, merchantSecret: string): string {
  const hashedSecret = md5(merchantSecret).toUpperCase();
  const amountFormatted = amount.toFixed(2);
  const hash = md5(merchantId + orderId + amountFormatted + currency + hashedSecret).toUpperCase();
  console.log("Generated hash for order:", orderId, "amount:", amountFormatted);
  return hash;
}

function verifyPaymentHash(
  merchantId: string,
  orderId: string,
  payhereAmount: string,
  payhereCurrency: string,
  statusCode: string,
  merchantSecret: string,
  receivedMd5sig: string
): boolean {
  const hashedSecret = md5(merchantSecret).toUpperCase();
  const localMd5sig = md5(merchantId + orderId + payhereAmount + payhereCurrency + statusCode + hashedSecret).toUpperCase();
  console.log("Verifying payment - Local sig:", localMd5sig, "Received sig:", receivedMd5sig);
  return localMd5sig === receivedMd5sig;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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

  // Select credentials based on payment mode
  let merchantId: string;
  let merchantSecret: string;
  let isSandbox: boolean;

  if (paymentMode.mode === "live") {
    merchantId = Deno.env.get("PAYHERE_MERCHANT_ID") || "";
    merchantSecret = Deno.env.get("PAYHERE_MERCHANT_SECRET") || "";
    isSandbox = false;
    console.log("Using LIVE mode credentials");
  } else if (paymentMode.test_environment === "localhost") {
    merchantId = Deno.env.get("PAYHERE_MERCHANT_SANDOBOX_ID") || "";
    merchantSecret = Deno.env.get("PAYHERE_MERCHANT_SECRET_SANDBOX_LOCALHOST") || "";
    isSandbox = true;
    console.log("Using TEST mode credentials (localhost)");
  } else {
    merchantId = Deno.env.get("PAYHERE_MERCHANT_SANDOBOX_ID") || "";
    merchantSecret = Deno.env.get("PAYHERE_MERCHANT_SANDBOX_SECRET_WEB") || "";
    isSandbox = true;
    console.log("Using TEST mode credentials (web)");
  }

  try {
    // Generate hash for checkout
    if (path === "generate-hash" && req.method === "POST") {
      const body: CheckoutRequest = await req.json();
      console.log("Generating hash for checkout:", body.order_id, "Mode:", paymentMode.mode);

      const hash = generateHash(merchantId, body.order_id, body.amount, body.currency, merchantSecret);

      // Create a pending payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: body.order_id,
          amount: body.amount,
          currency: body.currency,
          tier: body.custom_1,
          status: "pending",
          payment_method: "card",
          ref_creator: body.ref_creator || null,
          discount_code: body.discount_code || null,
        });

      if (paymentError) {
        console.error("Failed to create payment record:", paymentError);
      } else {
        console.log("Payment record created for order:", body.order_id);
      }

      return new Response(
        JSON.stringify({
          merchant_id: merchantId,
          hash: hash,
          sandbox: isSandbox,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify payment status endpoint - called from frontend before creating enrollment
    if (path === "verify-payment" && req.method === "POST") {
      const { order_id } = await req.json();
      
      if (!order_id) {
        return new Response(
          JSON.stringify({ error: "order_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: payment, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", order_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching payment:", error);
        return new Response(
          JSON.stringify({ error: "Failed to verify payment" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!payment) {
        return new Response(
          JSON.stringify({ verified: false, error: "Payment not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return detailed status information
      return new Response(
        JSON.stringify({
          verified: payment.status === "completed",
          status: payment.status,
          payment_id: payment.payment_id,
          amount: payment.amount,
          tier: payment.tier,
          ref_creator: payment.ref_creator,
          discount_code: payment.discount_code,
          failure_reason: payment.failure_reason,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment notification callback from PayHere
    if (path === "notify" && req.method === "POST") {
      const formData = await req.formData();
      
      const notifyMerchantId = formData.get("merchant_id")?.toString() || "";
      const orderId = formData.get("order_id")?.toString() || "";
      const paymentId = formData.get("payment_id")?.toString() || "";
      const payhereAmount = formData.get("payhere_amount")?.toString() || "";
      const payhereCurrency = formData.get("payhere_currency")?.toString() || "";
      const statusCode = formData.get("status_code")?.toString() || "";
      const md5sig = formData.get("md5sig")?.toString() || "";
      const custom1 = formData.get("custom_1")?.toString() || ""; // tier
      const custom2 = formData.get("custom_2")?.toString() || ""; // enrollment_id or 'new'
      const method = formData.get("method")?.toString() || "";
      const statusMessage = formData.get("status_message")?.toString() || "";

      console.log("Payment notification received:", {
        orderId,
        paymentId,
        statusCode,
        statusMessage,
        custom1,
        custom2,
        method,
      });

      // Verify the payment signature
      const isValid = verifyPaymentHash(
        notifyMerchantId,
        orderId,
        payhereAmount,
        payhereCurrency,
        statusCode,
        merchantSecret,
        md5sig
      );

      if (!isValid) {
        console.error("Invalid payment signature for order:", orderId);
        // Update payment status to failed with reason
        await supabase
          .from("payments")
          .update({ 
            status: "failed", 
            failure_reason: "Invalid payment signature - possible tampering detected",
            updated_at: new Date().toISOString() 
          })
          .eq("order_id", orderId);
        return new Response("Invalid signature", { status: 400 });
      }

      // Map status codes to status and failure reason
      let paymentStatus = "pending";
      let failureReason: string | null = null;

      if (statusCode === "2") {
        paymentStatus = "completed";
      } else if (statusCode === "-1") {
        paymentStatus = "cancelled";
        failureReason = statusMessage || FAILURE_REASONS["-1"];
      } else if (statusCode === "-2") {
        paymentStatus = "failed";
        // Try to get a more specific reason from the status message
        failureReason = statusMessage || FAILURE_REASONS["-2"];
        // Check for common decline reasons in the message
        const lowerMessage = (statusMessage || "").toLowerCase();
        if (lowerMessage.includes("insufficient")) {
          failureReason = DECLINE_REASONS["insufficient_funds"];
        } else if (lowerMessage.includes("limit") || lowerMessage.includes("exceeded")) {
          failureReason = DECLINE_REASONS["limit_exceeded"];
        } else if (lowerMessage.includes("honor") || lowerMessage.includes("declined")) {
          failureReason = DECLINE_REASONS["do_not_honor"];
        } else if (lowerMessage.includes("expired")) {
          failureReason = DECLINE_REASONS["expired_card"];
        } else if (lowerMessage.includes("network") || lowerMessage.includes("timeout")) {
          failureReason = DECLINE_REASONS["network_error"];
        }
      } else if (statusCode === "-3") {
        paymentStatus = "chargedback";
        failureReason = statusMessage || FAILURE_REASONS["-3"];
      } else if (statusCode === "0") {
        paymentStatus = "pending";
      }

      console.log("Payment status mapped:", { paymentStatus, failureReason });

      // Update payment record with status and failure reason
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: paymentStatus,
          payment_id: paymentId,
          failure_reason: failureReason,
          processed_at: paymentStatus === "completed" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);

      if (updateError) {
        console.error("Failed to update payment record:", updateError);
      }

      // Payment successful (status_code = 2)
      if (statusCode === "2") {
        console.log("Payment successful for order:", orderId);

        // Check if this is an upgrade or new purchase
        if (custom2 && custom2 !== "new") {
          // This is an upgrade - update the enrollment tier
          const enrollmentId = custom2;
          const newTier = custom1;

          const { error: enrollmentUpdateError } = await supabase
            .from("enrollments")
            .update({ tier: newTier })
            .eq("id", enrollmentId);

          if (enrollmentUpdateError) {
            console.error("Failed to update enrollment:", enrollmentUpdateError);
          } else {
            console.log("Enrollment upgraded to:", newTier);
            
            // Update payment record with enrollment_id
            await supabase
              .from("payments")
              .update({ enrollment_id: enrollmentId })
              .eq("order_id", orderId);
          }

          // Also check if there's a pending upgrade request and approve it
          const { data: upgradeRequest } = await supabase
            .from("upgrade_requests")
            .select("*")
            .eq("enrollment_id", enrollmentId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (upgradeRequest) {
            await supabase
              .from("upgrade_requests")
              .update({
                status: "approved",
                reviewed_at: new Date().toISOString(),
                admin_notes: `Auto-approved via PayHere payment. Payment ID: ${paymentId}`,
              })
              .eq("id", upgradeRequest.id);
          }
        }

        // Log the successful payment
        console.log("Payment processed successfully:", {
          orderId,
          paymentId,
          amount: payhereAmount,
          tier: custom1,
        });
      } else {
        console.log("Payment not successful. Status code:", statusCode, "Reason:", failureReason);
      }

      return new Response("OK", { status: 200 });
    }

    // Update payment with user_id and enrollment_id
    if (path === "update-payment" && req.method === "POST") {
      const { order_id, user_id, enrollment_id } = await req.json();
      
      if (!order_id) {
        return new Response(
          JSON.stringify({ error: "order_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("payments")
        .update({
          user_id,
          enrollment_id,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", order_id);

      if (error) {
        console.error("Error updating payment:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update payment" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in payhere-checkout function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});