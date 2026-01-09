import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

  // Verify admin role
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

  console.log("Admin purge initiated by:", user.id);

  try {
    // Get admin and CMO user IDs to preserve
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["super_admin", "content_admin", "support_admin", "admin", "cmo"]);
    
    const preservedUserIds = adminRoles?.map(r => r.user_id) || [];
    console.log("Preserving user IDs:", preservedUserIds);

    // Delete in correct order to respect foreign keys
    // 1. payment_attributions
    const { error: e1 } = await supabase.from("payment_attributions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e1) console.error("payment_attributions delete error:", e1);

    // 2. user_attributions
    const { error: e2 } = await supabase.from("user_attributions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e2) console.error("user_attributions delete error:", e2);

    // 3. payments
    const { error: e3 } = await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e3) console.error("payments delete error:", e3);

    // 4. join_requests
    const { error: e4 } = await supabase.from("join_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e4) console.error("join_requests delete error:", e4);

    // 5. withdrawal_requests
    const { error: e5 } = await supabase.from("withdrawal_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e5) console.error("withdrawal_requests delete error:", e5);

    // 6. withdrawal_methods
    const { error: e6 } = await supabase.from("withdrawal_methods").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e6) console.error("withdrawal_methods delete error:", e6);

    // 7. creator_payouts
    const { error: e7 } = await supabase.from("creator_payouts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e7) console.error("creator_payouts delete error:", e7);

    // 8. cmo_payouts
    const { error: e8 } = await supabase.from("cmo_payouts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e8) console.error("cmo_payouts delete error:", e8);

    // 9. discount_codes
    const { error: e9 } = await supabase.from("discount_codes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e9) console.error("discount_codes delete error:", e9);

    // 10. creator_profiles
    const { error: e10 } = await supabase.from("creator_profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e10) console.error("creator_profiles delete error:", e10);

    // 11. user_subjects
    const { error: e11 } = await supabase.from("user_subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e11) console.error("user_subjects delete error:", e11);

    // 12. download_logs
    const { error: e12 } = await supabase.from("download_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e12) console.error("download_logs delete error:", e12);

    // 13. upgrade_requests
    const { error: e13 } = await supabase.from("upgrade_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e13) console.error("upgrade_requests delete error:", e13);

    // 14. enrollments
    const { error: e14 } = await supabase.from("enrollments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e14) console.error("enrollments delete error:", e14);

    // 15. access_codes
    const { error: e15 } = await supabase.from("access_codes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e15) console.error("access_codes delete error:", e15);

    // 16. user_sessions
    const { error: e16 } = await supabase.from("user_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e16) console.error("user_sessions delete error:", e16);

    // 17. user_roles - only student, creator, user roles
    const { error: e17 } = await supabase.from("user_roles").delete().in("role", ["student", "creator", "user"]);
    if (e17) console.error("user_roles delete error:", e17);

    // 18. profiles - exclude admin/cmo users
    if (preservedUserIds.length > 0) {
      // Delete profiles where user_id is NOT in preserved list
      const { data: allProfiles } = await supabase.from("profiles").select("id, user_id");
      const profilesToDelete = (allProfiles || [])
        .filter(p => !preservedUserIds.includes(p.user_id))
        .map(p => p.id);
      
      if (profilesToDelete.length > 0) {
        for (const profileId of profilesToDelete) {
          await supabase.from("profiles").delete().eq("id", profileId);
        }
      }
    } else {
      const { error: e18 } = await supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (e18) console.error("profiles delete error:", e18);
    }

    console.log("Purge completed successfully");

    return new Response(
      JSON.stringify({ success: true, message: "All user data cleared. Admin & CMO accounts preserved." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Purge error:", error);
    const errorMessage = error instanceof Error ? error.message : "Purge failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
