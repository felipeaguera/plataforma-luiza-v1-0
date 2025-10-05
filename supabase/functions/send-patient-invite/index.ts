import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  patientId: string;
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, email, fullName }: InviteRequest = await req.json();
    
    console.log('Sending invite to:', email, 'for patient:', patientId);

    // Create activation token (valid for 7 days)
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store token in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error: tokenError } = await supabase
      .from('patient_activation_tokens')
      .insert({
        patient_id: patientId,
        token: token,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      console.error('Error storing token:', tokenError);
      throw new Error('Failed to store activation token');
    }

    // Create activation link
    const activationLink = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/paciente/ativar?token=${token}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Aguera Dermatologia <onboarding@resend.dev>",
      to: [email],
      subject: "Bem-vindo à Plataforma Aguera Dermatologia",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Olá, ${fullName}!</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Você foi cadastrado na plataforma de atendimento da Aguera Dermatologia.
          </p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Para ativar sua conta e definir sua senha, clique no botão abaixo:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationLink}" 
               style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
              Ativar Minha Conta
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; line-height: 1.5;">
            Este link é válido por 7 dias. Se você não solicitou este cadastro, por favor ignore este email.
          </p>
          
          <p style="color: #999; font-size: 14px; line-height: 1.5;">
            Caso o botão não funcione, copie e cole este link no seu navegador:<br>
            <a href="${activationLink}" style="color: #4CAF50;">${activationLink}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            Aguera Dermatologia - Cuidando da sua pele<br>
            Este é um email automático, por favor não responda.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update patient record
    const { error: updateError } = await supabase
      .from('patients')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('id', patientId);

    if (updateError) {
      console.error('Error updating patient:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Convite enviado com sucesso' 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-patient-invite function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);