import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default fallback rates (used when DB tiers not available)
const CREATOR_BASE_RATE = 0.08; // 8% default
const CREATOR_DEFAULT_RATE = 0.12; // 12% for new creators (30-day protection)

// CMO Commission rates
const CMO_COMMISSION_RATE = 0.08; // 8% of revenue from their creators
const CMO_BONUS_RATE = 0.05; // Additional 5% bonus
const CMO_ANNUAL_USER_GOAL = 280; // 280 users annually for bonus

// Helper function to get commission rate from database based on MONTHLY users (rolling 30 days)
// Includes 30-day tier protection for new creators
async function getCreatorCommissionRate(supabase: any, creatorId: string): Promise<number> {
  // First, check if creator has tier protection
  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("tier_protection_until, current_tier_level, created_at")
    .eq("id", creatorId)
    .single();

  const now = new Date();
  
  // Check if still in protection period
  if (creatorProfile?.tier_protection_until) {
    const protectionEnd = new Date(creatorProfile.tier_protection_until);
    if (now < protectionEnd) {
      console.log(`Creator ${creatorId}: Still in 30-day protection period, using Tier 2 (12%)`);
      return 0.12; // Default tier 2 rate
    }
  }

  // Get rolling 30-day paid users count
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: monthlyCount } = await supabase
    .from("payment_attributions")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  const monthlyPaidUsers = monthlyCount || 0;

  // Fetch commission tiers from database
  const { data: tiers } = await supabase
    .from("commission_tiers")
    .select("tier_level, commission_rate, monthly_user_threshold")
    .order("tier_level", { ascending: true });

  if (!tiers || tiers.length === 0) {
    // Fallback to default based on monthly users
    console.log(`Creator ${creatorId}: No tiers found, using fallback. ${monthlyPaidUsers} monthly users`);
    return monthlyPaidUsers >= 100 ? 0.12 : 0.08;
  }

  // Find applicable tier based on monthly users (descending to find highest matching tier)
  let commissionRate = tiers[0].commission_rate / 100; // Start with base tier
  let currentTierLevel = 1;
  
  for (const tier of tiers) {
    if (monthlyPaidUsers >= tier.monthly_user_threshold) {
      commissionRate = tier.commission_rate / 100;
      currentTierLevel = tier.tier_level;
    }
  }

  // Update creator's current tier level for tracking
  await supabase
    .from("creator_profiles")
    .update({ current_tier_level: currentTierLevel })
    .eq("id", creatorId);

  console.log(`Creator ${creatorId}: ${monthlyPaidUsers} monthly users (30-day rolling), Tier ${currentTierLevel}, rate: ${commissionRate * 100}%`);
  return commissionRate;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error("Auth error:", authError);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if this is a user-accessible endpoint (finalize-payment-user)
  const isUserEndpoint = path === "finalize-payment-user";

  // For admin-only endpoints, verify admin role
  if (!isUserEndpoint) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin", "content_admin", "support_admin"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Finalize a payment from user after card payment - creates attribution, updates commissions
    // This endpoint can be called by the paying user themselves
    // IDEMPOTENT: Check attribution FIRST, only update stats if NEW attribution created
    if (path === "finalize-payment-user" && req.method === "POST") {
      const body = await req.json();
      const {
        order_id,
        enrollment_id,
        payment_type,
        tier,
        original_amount,
        final_amount,
        ref_creator,
        discount_code,
      } = body;

      // IMPORTANT: Use the authenticated user's ID, not from request body
      const user_id = user.id;

      console.log("Finalizing payment (user):", { order_id, user_id, tier, final_amount, ref_creator });

      // STEP 1: Check if attribution already exists - EARLY EXIT if so
      const { data: existingAttribution } = await supabase
        .from("payment_attributions")
        .select("id, creator_id")
        .eq("order_id", order_id)
        .maybeSingle();

      if (existingAttribution) {
        console.log("Attribution already exists for order:", order_id, "- Returning early without updating stats");
        return new Response(
          JSON.stringify({ success: true, message: "Attribution already exists", creator_id: existingAttribution.creator_id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // STEP 2: Find creator (but DON'T update stats yet)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      const paymentMonth = currentMonth.toISOString().split("T")[0];

      let creatorId: string | null = null;
      let discountCodeId: string | null = null;
      let creatorCommissionAmount = 0;
      let creatorCommissionRate = 0;
      let creatorData: any = null;

      // Find creator by referral code
      if (ref_creator) {
        const { data: foundCreator } = await supabase
          .from("creator_profiles")
          .select("id, lifetime_paid_users, available_balance, cmo_id")
          .eq("referral_code", ref_creator.toUpperCase())
          .maybeSingle();

        if (foundCreator) {
          creatorId = foundCreator.id;
          creatorData = foundCreator;
          // Use dynamic commission rate from DB tiers
          creatorCommissionRate = await getCreatorCommissionRate(supabase, foundCreator.id);
          // COMMISSION FORMULA: commission = final_sale_price × commission_rate
          // This is the CORRECT calculation - always from final amount (sale price after discount)
          creatorCommissionAmount = final_amount * creatorCommissionRate;
          console.log(`[COMMISSION] Creator ${creatorId} | Final Sale Price: Rs.${final_amount} | Rate: ${(creatorCommissionRate * 100).toFixed(1)}% | Commission: Rs.${creatorCommissionAmount.toFixed(2)} | Formula: ${final_amount} × ${creatorCommissionRate} = ${creatorCommissionAmount}`);
        }
      }

      // Find creator by discount code if not found by ref
      if (!creatorId && discount_code) {
        const { data: dcData } = await supabase
          .from("discount_codes")
          .select("id, creator_id")
          .eq("code", discount_code.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();

        if (dcData && dcData.creator_id) {
          creatorId = dcData.creator_id;
          discountCodeId = dcData.id;

          const { data: foundCreator } = await supabase
            .from("creator_profiles")
            .select("id, lifetime_paid_users, available_balance, cmo_id")
            .eq("id", creatorId)
            .single();

          if (foundCreator) {
            creatorData = foundCreator;
            // Use dynamic commission rate from DB tiers
            creatorCommissionRate = await getCreatorCommissionRate(supabase, foundCreator.id);
            // COMMISSION FORMULA: commission = final_sale_price × commission_rate
            creatorCommissionAmount = final_amount * creatorCommissionRate;
            console.log(`[COMMISSION] Creator ${foundCreator.id} (via discount code) | Final Sale Price: Rs.${final_amount} | Rate: ${(creatorCommissionRate * 100).toFixed(1)}% | Commission: Rs.${creatorCommissionAmount.toFixed(2)}`);
          }
        }
      }

      // CRITICAL RULE: NO REFERRAL = NO COMMISSION - 100% revenue to platform
      if (!creatorId) {
        console.log("NO REFERRAL - 100% revenue to platform. User:", user_id, "Amount:", final_amount);
        creatorCommissionAmount = 0;
        creatorCommissionRate = 0;
      }

      // STEP 3: Create payment attribution FIRST (this is the source of truth)
      const { error: paError } = await supabase.from("payment_attributions").insert({
        order_id,
        user_id,
        creator_id: creatorId,
        enrollment_id,
        amount: final_amount,
        original_amount,
        discount_applied: original_amount - final_amount,
        final_amount,
        creator_commission_rate: creatorCommissionRate,
        creator_commission_amount: creatorCommissionAmount,
        payment_month: paymentMonth,
        tier,
        payment_type,
      });

      if (paError) {
        console.error("Payment attribution insert error:", paError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create attribution: " + paError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Payment attribution created successfully for order:", order_id);

      // STEP 4: Only NOW update stats (since attribution was successfully created)
      if (creatorId && creatorData) {
        // Update creator balance and paid users
        await supabase
          .from("creator_profiles")
          .update({
            lifetime_paid_users: (creatorData.lifetime_paid_users || 0) + 1,
            available_balance: (creatorData.available_balance || 0) + creatorCommissionAmount,
          })
          .eq("id", creatorId);

        // Create user attribution if doesn't exist (using upsert with unique constraint)
        await supabase.from("user_attributions").upsert({
          user_id,
          creator_id: creatorId,
          discount_code_id: discountCodeId,
          referral_source: discountCodeId ? "discount_code" : "link",
        }, { onConflict: "user_id" });

        // Update discount code stats if applicable
        if (discountCodeId) {
          const { data: currentDC } = await supabase
            .from("discount_codes")
            .select("usage_count, paid_conversions")
            .eq("id", discountCodeId)
            .single();

          if (currentDC) {
            await supabase
              .from("discount_codes")
              .update({
                usage_count: (currentDC.usage_count || 0) + 1,
                paid_conversions: (currentDC.paid_conversions || 0) + 1,
              })
              .eq("id", discountCodeId);
          }
        }

        // Handle CMO commission
        if (creatorData.cmo_id) {
          await updateCMOPayout(supabase, creatorData.cmo_id, final_amount, paymentMonth);
        }
      }

      return new Response(
        JSON.stringify({ success: true, creator_id: creatorId, commission: creatorCommissionAmount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Finalize a payment (admin-only) - creates attribution, updates commissions
    // IDEMPOTENT: Check attribution FIRST, only update stats if NEW attribution created
    if (path === "finalize-payment" && req.method === "POST") {
      const body = await req.json();
      const {
        order_id,
        user_id,
        enrollment_id,
        payment_type,
        tier,
        original_amount,
        final_amount,
        ref_creator,
        discount_code,
      } = body;

      console.log("Finalizing payment:", { order_id, user_id, tier, final_amount, ref_creator });

      // STEP 1: Check if attribution already exists - EARLY EXIT if so
      const { data: existingAttribution } = await supabase
        .from("payment_attributions")
        .select("id, creator_id")
        .eq("order_id", order_id)
        .maybeSingle();

      if (existingAttribution) {
        console.log("Attribution already exists for order:", order_id, "- Returning early without updating stats");
        return new Response(
          JSON.stringify({ success: true, message: "Attribution already exists", creator_id: existingAttribution.creator_id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // STEP 2: Find creator (but DON'T update stats yet)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      const paymentMonth = currentMonth.toISOString().split("T")[0];

      let creatorId: string | null = null;
      let discountCodeId: string | null = null;
      let creatorCommissionAmount = 0;
      let creatorCommissionRate = 0;
      let creatorData: any = null;

      // Find creator by referral code
      if (ref_creator) {
        const { data: foundCreator } = await supabase
          .from("creator_profiles")
          .select("id, lifetime_paid_users, available_balance, cmo_id")
          .eq("referral_code", ref_creator.toUpperCase())
          .maybeSingle();

        if (foundCreator) {
          creatorId = foundCreator.id;
          creatorData = foundCreator;
          // Use dynamic commission rate from DB tiers
          creatorCommissionRate = await getCreatorCommissionRate(supabase, foundCreator.id);
          // COMMISSION FORMULA: commission = final_sale_price × commission_rate
          creatorCommissionAmount = final_amount * creatorCommissionRate;
          console.log(`[COMMISSION] Creator ${creatorId} | Final Sale Price: Rs.${final_amount} | Rate: ${(creatorCommissionRate * 100).toFixed(1)}% | Commission: Rs.${creatorCommissionAmount.toFixed(2)} | Formula: ${final_amount} × ${creatorCommissionRate} = ${creatorCommissionAmount}`);
        }
      }

      // Find creator by discount code if not found by ref
      if (!creatorId && discount_code) {
        const { data: dcData } = await supabase
          .from("discount_codes")
          .select("id, creator_id")
          .eq("code", discount_code.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();

        if (dcData && dcData.creator_id) {
          creatorId = dcData.creator_id;
          discountCodeId = dcData.id;

          const { data: foundCreator } = await supabase
            .from("creator_profiles")
            .select("id, lifetime_paid_users, available_balance, cmo_id")
            .eq("id", creatorId)
            .single();

          if (foundCreator) {
            creatorData = foundCreator;
            // Use dynamic commission rate from DB tiers
            creatorCommissionRate = await getCreatorCommissionRate(supabase, foundCreator.id);
            // COMMISSION FORMULA: commission = final_sale_price × commission_rate
            creatorCommissionAmount = final_amount * creatorCommissionRate;
            console.log(`[COMMISSION] Creator ${foundCreator.id} (via discount code) | Final Sale Price: Rs.${final_amount} | Rate: ${(creatorCommissionRate * 100).toFixed(1)}% | Commission: Rs.${creatorCommissionAmount.toFixed(2)}`);
          }
        }
      }

      // CRITICAL RULE: NO REFERRAL = NO COMMISSION - 100% revenue to platform
      if (!creatorId) {
        console.log("NO REFERRAL - 100% revenue to platform. User:", user_id, "Amount:", final_amount);
        creatorCommissionAmount = 0;
        creatorCommissionRate = 0;
      }

      // STEP 3: Create payment attribution FIRST (this is the source of truth)
      const { error: paError } = await supabase.from("payment_attributions").insert({
        order_id,
        user_id,
        creator_id: creatorId,
        enrollment_id,
        amount: final_amount,
        original_amount,
        discount_applied: original_amount - final_amount,
        final_amount,
        creator_commission_rate: creatorCommissionRate,
        creator_commission_amount: creatorCommissionAmount,
        payment_month: paymentMonth,
        tier,
        payment_type,
      });

      if (paError) {
        console.error("Payment attribution insert error:", paError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create attribution: " + paError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Payment attribution created successfully for order:", order_id);

      // STEP 4: Only NOW update stats (since attribution was successfully created)
      if (creatorId && creatorData) {
        // Update creator balance and paid users
        await supabase
          .from("creator_profiles")
          .update({
            lifetime_paid_users: (creatorData.lifetime_paid_users || 0) + 1,
            available_balance: (creatorData.available_balance || 0) + creatorCommissionAmount,
          })
          .eq("id", creatorId);

        // Create user attribution if doesn't exist
        await supabase.from("user_attributions").upsert({
          user_id,
          creator_id: creatorId,
          discount_code_id: discountCodeId,
          referral_source: discountCodeId ? "discount_code" : "link",
        }, { onConflict: "user_id" });

        // Update discount code stats if applicable
        if (discountCodeId) {
          const { data: currentDC } = await supabase
            .from("discount_codes")
            .select("usage_count, paid_conversions")
            .eq("id", discountCodeId)
            .single();

          if (currentDC) {
            await supabase
              .from("discount_codes")
              .update({
                usage_count: (currentDC.usage_count || 0) + 1,
                paid_conversions: (currentDC.paid_conversions || 0) + 1,
              })
              .eq("id", discountCodeId);
          }
        }

        // Handle CMO commission
        if (creatorData.cmo_id) {
          await updateCMOPayout(supabase, creatorData.cmo_id, final_amount, paymentMonth);
        }
      }

      return new Response(
        JSON.stringify({ success: true, creator_id: creatorId, commission: creatorCommissionAmount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Approve join request
    // IDEMPOTENT: Check attribution FIRST, only update stats if NEW attribution created
    if (path === "approve-join-request" && req.method === "POST") {
      const { join_request_id, admin_notes } = await req.json();

      console.log("Approving join request:", join_request_id);

      // Get the join request
      const { data: request, error: reqError } = await supabase
        .from("join_requests")
        .select("*")
        .eq("id", join_request_id)
        .single();

      if (reqError || !request) {
        return new Response(JSON.stringify({ error: "Join request not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.status !== "pending") {
        return new Response(JSON.stringify({ error: "Request already processed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderId = `BANK-${request.reference_number}`;

      // STEP 1: Check if attribution already exists for this join request
      const { data: existingAttribution } = await supabase
        .from("payment_attributions")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingAttribution) {
        console.log("Attribution already exists for join request:", orderId);
        // Still update the join request status if not done
        await supabase
          .from("join_requests")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            admin_notes: admin_notes || null,
          })
          .eq("id", join_request_id);
        
        return new Response(
          JSON.stringify({ success: true, message: "Already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate expiry
      const durationDays = request.tier === "lifetime" ? null : 365;
      const expiresAt = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .insert({
          user_id: request.user_id,
          grade: request.grade,
          stream: request.stream || "maths",
          medium: request.medium || "english",
          tier: request.tier,
          expires_at: expiresAt,
          is_active: true,
          payment_order_id: orderId,
        })
        .select()
        .single();

      if (enrollmentError) {
        console.error("Enrollment creation error:", enrollmentError);
        return new Response(JSON.stringify({ error: "Failed to create enrollment" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save subjects if provided
      if (request.subject_1 && request.subject_2 && request.subject_3) {
        await supabase.from("user_subjects").insert({
          user_id: request.user_id,
          enrollment_id: enrollment.id,
          subject_1: request.subject_1,
          subject_2: request.subject_2,
          subject_3: request.subject_3,
          is_locked: true,
          locked_at: new Date().toISOString(),
        });
      }

      // STEP 2: Find creator (but DON'T update stats yet)
      const paymentMonth = new Date();
      paymentMonth.setDate(1);
      const paymentMonthStr = paymentMonth.toISOString().split("T")[0];

      let creatorId: string | null = null;
      let creatorCommissionAmount = 0;
      let creatorCommissionRate = 0;
      let creatorData: any = null;
      let discountCodeId: string | null = null;

      // Handle referral
      if (request.ref_creator) {
        const { data: foundCreator } = await supabase
          .from("creator_profiles")
          .select("id, lifetime_paid_users, available_balance, cmo_id")
          .eq("referral_code", request.ref_creator.toUpperCase())
          .maybeSingle();

        if (foundCreator) {
          creatorId = foundCreator.id;
          creatorData = foundCreator;
          // Use dynamic commission rate from DB tiers
          creatorCommissionRate = await getCreatorCommissionRate(supabase, foundCreator.id);
          creatorCommissionAmount = request.amount * creatorCommissionRate;
        }
      }

      // Also check discount code
      if (!creatorId && request.discount_code) {
        const { data: dcData } = await supabase
          .from("discount_codes")
          .select("id, creator_id")
          .eq("code", request.discount_code.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();

        if (dcData && dcData.creator_id) {
          creatorId = dcData.creator_id;
          discountCodeId = dcData.id;

          const { data: foundCreator } = await supabase
            .from("creator_profiles")
            .select("id, lifetime_paid_users, available_balance, cmo_id")
            .eq("id", creatorId)
            .single();

          if (foundCreator) {
            creatorData = foundCreator;
            // Use dynamic commission rate from DB tiers
            creatorCommissionRate = await getCreatorCommissionRate(supabase, foundCreator.id);
            creatorCommissionAmount = request.amount * creatorCommissionRate;
          }
        }
      }

      // CRITICAL RULE: NO REFERRAL = NO COMMISSION - 100% revenue to platform
      if (!creatorId) {
        console.log("NO REFERRAL (join request) - 100% revenue to platform. User:", request.user_id, "Amount:", request.amount);
        creatorCommissionAmount = 0;
        creatorCommissionRate = 0;
      }

      // STEP 3: Create payment attribution FIRST (source of truth)
      const { error: paError } = await supabase.from("payment_attributions").insert({
        order_id: orderId,
        user_id: request.user_id,
        creator_id: creatorId,
        enrollment_id: enrollment.id,
        amount: request.amount,
        original_amount: request.amount,
        final_amount: request.amount,
        creator_commission_rate: creatorCommissionRate,
        creator_commission_amount: creatorCommissionAmount,
        payment_month: paymentMonthStr,
        tier: request.tier,
        payment_type: "bank",
      });

      if (paError) {
        console.error("Payment attribution error:", paError);
        // Don't fail the whole request, just log it
      }

      // STEP 4: Only NOW update stats (since attribution was created)
      if (creatorId && creatorData && !paError) {
        // Update creator
        await supabase
          .from("creator_profiles")
          .update({
            lifetime_paid_users: (creatorData.lifetime_paid_users || 0) + 1,
            available_balance: (creatorData.available_balance || 0) + creatorCommissionAmount,
          })
          .eq("id", creatorId);

        // User attribution
        await supabase.from("user_attributions").upsert({
          user_id: request.user_id,
          creator_id: creatorId,
          discount_code_id: discountCodeId,
          referral_source: discountCodeId ? "discount_code" : "link",
        }, { onConflict: "user_id" });

        // CMO commission
        if (creatorData.cmo_id) {
          await updateCMOPayout(supabase, creatorData.cmo_id, request.amount, paymentMonthStr);
        }
      }

      // Update join request status
      await supabase
        .from("join_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: admin_notes || null,
        })
        .eq("id", join_request_id);

      console.log("Join request approved:", join_request_id);

      return new Response(
        JSON.stringify({ success: true, enrollment_id: enrollment.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Approve upgrade request
    // IDEMPOTENT: Check attribution FIRST, only update stats if NEW attribution created
    if (path === "approve-upgrade-request" && req.method === "POST") {
      const { upgrade_request_id, admin_notes } = await req.json();

      console.log("Approving upgrade request:", upgrade_request_id);

      const { data: request, error: reqError } = await supabase
        .from("upgrade_requests")
        .select("*")
        .eq("id", upgrade_request_id)
        .single();

      if (reqError || !request) {
        return new Response(JSON.stringify({ error: "Upgrade request not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.status !== "pending") {
        return new Response(JSON.stringify({ error: "Request already processed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderId = `UPGRADE-${request.reference_number}`;

      // Check for existing attribution
      const { data: existingAttribution } = await supabase
        .from("payment_attributions")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingAttribution) {
        console.log("Attribution already exists for upgrade:", orderId);
        await supabase
          .from("upgrade_requests")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            admin_notes: admin_notes || null,
          })
          .eq("id", upgrade_request_id);
        
        return new Response(
          JSON.stringify({ success: true, message: "Already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the enrollment to update
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("id", request.enrollment_id)
        .single();

      if (enrollmentError || !enrollment) {
        return new Response(JSON.stringify({ error: "Enrollment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate new expiry
      const isLifetimeUpgrade = request.requested_tier === "lifetime";
      const newExpiresAt = isLifetimeUpgrade 
        ? null 
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      // Update the enrollment
      await supabase
        .from("enrollments")
        .update({
          tier: request.requested_tier,
          expires_at: newExpiresAt,
        })
        .eq("id", request.enrollment_id);

      // Handle attribution if there's an amount
      const paymentMonth = new Date();
      paymentMonth.setDate(1);
      const paymentMonthStr = paymentMonth.toISOString().split("T")[0];

      if (request.amount && request.amount > 0) {
        // Find original referrer
        const { data: userAttribution } = await supabase
          .from("user_attributions")
          .select("creator_id")
          .eq("user_id", request.user_id)
          .maybeSingle();

        let creatorId: string | null = null;
        let creatorCommissionAmount = 0;
        let creatorCommissionRate = 0;
        let creatorData: any = null;

        if (userAttribution?.creator_id) {
          creatorId = userAttribution.creator_id;
          const { data: foundCreator } = await supabase
            .from("creator_profiles")
            .select("id, lifetime_paid_users, available_balance, cmo_id")
            .eq("id", creatorId)
            .single();

          if (foundCreator) {
            creatorData = foundCreator;
            // Use dynamic commission rate from DB tiers
            creatorCommissionRate = await getCreatorCommissionRate(supabase, foundCreator.id);
            creatorCommissionAmount = request.amount * creatorCommissionRate;
          }
        }

        // Create attribution
        const { error: paError } = await supabase.from("payment_attributions").insert({
          order_id: orderId,
          user_id: request.user_id,
          creator_id: creatorId,
          enrollment_id: request.enrollment_id,
          amount: request.amount,
          original_amount: request.amount,
          final_amount: request.amount,
          creator_commission_rate: creatorCommissionRate,
          creator_commission_amount: creatorCommissionAmount,
          payment_month: paymentMonthStr,
          tier: request.requested_tier,
          payment_type: "upgrade",
        });

        if (!paError && creatorId && creatorData) {
          // Update creator stats
          await supabase
            .from("creator_profiles")
            .update({
              available_balance: (creatorData.available_balance || 0) + creatorCommissionAmount,
            })
            .eq("id", creatorId);

          // CMO commission
          if (creatorData.cmo_id) {
            await updateCMOPayout(supabase, creatorData.cmo_id, request.amount, paymentMonthStr);
          }
        }
      }

      // Update request status
      await supabase
        .from("upgrade_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: admin_notes || null,
        })
        .eq("id", upgrade_request_id);

      console.log("Upgrade request approved:", upgrade_request_id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Recalculate all stats from payment_attributions
    if (path === "recalculate-stats" && req.method === "POST") {
      console.log("Recalculating all stats from payment_attributions...");

      // Reset all creator stats
      await supabase
        .from("creator_profiles")
        .update({
          lifetime_paid_users: 0,
          monthly_paid_users: 0,
          available_balance: 0,
        });

      // Get all payment attributions
      const { data: allAttributions } = await supabase
        .from("payment_attributions")
        .select("*");

      if (!allAttributions) {
        return new Response(
          JSON.stringify({ success: true, message: "No attributions found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Current month for monthly calculations
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      const currentMonthStr = currentMonth.toISOString().split("T")[0];

      // Aggregate stats by creator
      const creatorStats: Record<string, { lifetime: number; monthly: number; balance: number }> = {};

      for (const attr of allAttributions) {
        if (!attr.creator_id) continue;

        if (!creatorStats[attr.creator_id]) {
          creatorStats[attr.creator_id] = { lifetime: 0, monthly: 0, balance: 0 };
        }

        creatorStats[attr.creator_id].lifetime += 1;
        creatorStats[attr.creator_id].balance += Number(attr.creator_commission_amount || 0);

        // Check if this month
        if (attr.payment_month && attr.payment_month >= currentMonthStr) {
          creatorStats[attr.creator_id].monthly += 1;
        }
      }

      // Update each creator
      for (const [creatorId, stats] of Object.entries(creatorStats)) {
        // Get current withdrawn amount (don't reset this)
        const { data: creator } = await supabase
          .from("creator_profiles")
          .select("total_withdrawn")
          .eq("id", creatorId)
          .single();

        const totalWithdrawn = creator?.total_withdrawn || 0;
        const availableBalance = stats.balance - totalWithdrawn;

        await supabase
          .from("creator_profiles")
          .update({
            lifetime_paid_users: stats.lifetime,
            monthly_paid_users: stats.monthly,
            available_balance: Math.max(0, availableBalance),
          })
          .eq("id", creatorId);
      }

      console.log(`Recalculated stats for ${Object.keys(creatorStats).length} creators`);

      return new Response(
        JSON.stringify({ success: true, creators_updated: Object.keys(creatorStats).length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Revenue stats endpoint
    if (path === "revenue-stats" && req.method === "GET") {
      // Get all payment attributions
      const { data: allPayments } = await supabase
        .from("payment_attributions")
        .select("final_amount, payment_month");

      const totalRevenue = (allPayments || []).reduce(
        (sum, p) => sum + Number(p.final_amount || 0), 0
      );

      // Current month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const currentMonthStr = currentMonth.toISOString().split("T")[0];

      const thisMonthRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= currentMonthStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      // Last 6 months breakdown
      const monthlyData: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7);
        monthlyData[monthKey] = 0;
      }

      (allPayments || []).forEach(p => {
        if (p.payment_month) {
          const monthKey = p.payment_month.slice(0, 7);
          if (monthlyData.hasOwnProperty(monthKey)) {
            monthlyData[monthKey] += Number(p.final_amount || 0);
          }
        }
      });

      return new Response(
        JSON.stringify({
          total_revenue: totalRevenue,
          this_month_revenue: thisMonthRevenue,
          monthly_breakdown: monthlyData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper to update CMO payout
async function updateCMOPayout(supabase: any, cmoId: string, paymentAmount: number, paymentMonth: string) {
  // Get or create CMO payout record for this month
  const { data: existingPayout } = await supabase
    .from("cmo_payouts")
    .select("*")
    .eq("cmo_id", cmoId)
    .eq("payout_month", paymentMonth)
    .maybeSingle();

  const cmoCommission = paymentAmount * CMO_COMMISSION_RATE;

  if (existingPayout) {
    await supabase
      .from("cmo_payouts")
      .update({
        total_paid_users: (existingPayout.total_paid_users || 0) + 1,
        total_commission: (existingPayout.total_commission || 0) + cmoCommission,
        base_commission_amount: (existingPayout.base_commission_amount || 0) + cmoCommission,
      })
      .eq("id", existingPayout.id);
  } else {
    await supabase.from("cmo_payouts").insert({
      cmo_id: cmoId,
      payout_month: paymentMonth,
      total_paid_users: 1,
      total_commission: cmoCommission,
      base_commission_amount: cmoCommission,
      bonus_amount: 0,
      status: "pending",
    });
  }
}