import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
    const { patientId } = await req.json();

    if (!patientId) {
      throw new Error("Patient ID is required");
    }

    // Get the origin URL from the request
    const origin = req.headers.get("origin") || "https://098eb491-9a9c-4b08-ba6a-5b7f903326a2.lovableproject.com";

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
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

    // Get patient data
    const { data: patient, error: patientError } = await supabaseAdmin
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      throw new Error("Patient not found");
    }

    if (patient.user_id) {
      throw new Error("Patient already activated");
    }

    // Generate activation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Token expires in 48 hours

    // Save token to database
    const { error: tokenError } = await supabaseAdmin
      .from("patient_activation_tokens")
      .insert({
        patient_id: patientId,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (tokenError) {
      throw tokenError;
    }

    // Get the activation URL using the origin from the request
    const activationUrl = `${origin}/paciente/ativar?token=${token}`;

    console.log("Activation URL:", activationUrl); // Log para debug

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "Dra. Luiza Aguera <onboarding@resend.dev>",
      to: [patient.email],
      subject: "Ative sua conta - Portal da Paciente",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Bem-vinda ao Portal da Paciente!</h2>
          <p>Olá ${patient.full_name},</p>
          <p>A Dra. Luiza Aguera criou uma conta para você no portal da clínica.</p>
          <p>Para ativar sua conta e criar sua senha, clique no botão abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Ativar Minha Conta
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Este link expira em 48 horas.<br>
            Se você não solicitou esta conta, ignore este email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Dra. Luiza Aguera - Dermatologia<br>
            Este é um email automático, por favor não responda.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Email error:", emailError);
      throw emailError;
    }

    // Update patient invite_sent_at
    await supabaseAdmin
      .from("patients")
      .update({ invite_sent_at: new Date().toISOString() })
      .eq("id", patientId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation sent successfully",
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
