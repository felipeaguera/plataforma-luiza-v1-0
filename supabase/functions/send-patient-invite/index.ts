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
    const origin = req.headers.get("origin") || "https://agueradermatologia.com.br";

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

    // Get the activation URL - using the custom domain
    const projectUrl = "https://agueradermatologia.com.br";
    const activationUrl = `${projectUrl}/paciente/ativar?token=${token}`;

    console.log("Activation URL:", activationUrl); // Log para debug

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "Dra. Luiza Aguera <noreply@agueradermatologia.com.br>",
      to: [patient.email],
      subject: "Ative sua conta - Portal da Paciente",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #5a3dff 0%, #7c3aed 100%); padding: 30px 20px; text-align: center;">
            <img src="${projectUrl}/logo-aguera.jpeg" alt="Dra. Luiza Aguera" style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid white; object-fit: cover; margin-bottom: 16px; display: inline-block;" />
            <h2 style="color: white; margin: 0; font-size: 24px;">Dra. Luiza Aguera</h2>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Dermatologia</p>
          </div>
          <div style="padding: 30px 20px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 16px;">Olá ${patient.full_name},</p>
            <p style="color: #333; font-size: 16px; margin-bottom: 16px; line-height: 1.6;">Bem-vinda ao Portal da Paciente! A Dra. Luiza Aguera criou uma conta para você no portal da clínica.</p>
            <p style="color: #333; font-size: 16px; margin-bottom: 24px; line-height: 1.6;">Para ativar sua conta e criar sua senha, clique no botão abaixo:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${activationUrl}" 
                 style="background: #5a3dff; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 16px; font-weight: 600;">
                Ativar Minha Conta
              </a>
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 24px;">
              Este link expira em 48 horas.<br>
              Se você não solicitou esta conta, ignore este email.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #6c757d; margin: 0;">
              Este e-mail é automático. Por favor, não responda.
            </p>
          </div>
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
