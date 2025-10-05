import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      throw new Error("Token and password are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get token data
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("patient_activation_tokens")
      .select(`
        *,
        patients:patient_id (
          id,
          email,
          full_name,
          user_id
        )
      `)
      .eq("token", token)
      .eq("used", false)
      .single();

    if (tokenError || !tokenData) {
      throw new Error("Invalid or expired token");
    }

    const patient = Array.isArray(tokenData.patients) 
      ? tokenData.patients[0] 
      : tokenData.patients;

    if (!patient) {
      throw new Error("Patient not found");
    }

    if (patient.user_id) {
      throw new Error("Account already activated");
    }

    // Check token expiration
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      throw new Error("Token has expired");
    }

    // Create auth user
    let authUserId: string;
    
    // Try to create user, or get existing user if email already exists
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: patient.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: patient.full_name,
        },
      });

    if (authError) {
      // If user already exists, try to get it
      if (authError.message.includes("already been registered")) {
        const { data: existingUsers, error: listError } = 
          await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) throw listError;
        
        const existingUser = existingUsers.users.find(u => u.email === patient.email);
        
        if (!existingUser) {
          throw new Error("User exists but could not be found");
        }
        
        authUserId = existingUser.id;
        
        // Update the user's password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          { password: password }
        );
        
        if (updateError) throw updateError;
      } else {
        throw authError;
      }
    } else {
      authUserId = authData.user.id;
    }

    // Update patient record
    const { error: updateError } = await supabaseAdmin
      .from("patients")
      .update({
        user_id: authUserId,
        activated_at: new Date().toISOString(),
      })
      .eq("id", patient.id);

    if (updateError) {
      throw updateError;
    }

    // Mark token as used
    await supabaseAdmin
      .from("patient_activation_tokens")
      .update({ used: true })
      .eq("token", token);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account activated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
