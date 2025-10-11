import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  tipo: 'exame' | 'recomendacao' | 'novidade';
  ref_id: string;
  paciente_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tipo, ref_id, paciente_id }: NotificationRequest = await req.json();

    console.log("Processing notification:", { tipo, ref_id, paciente_id });

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

    const projectUrl = "https://agueradermatologia.com.br";
    let recipients: Array<{ email: string; name: string; id: string }> = [];
    let emailSubject = "";
    let emailContent = "";
    let destino = "paciente";

    // Get content details based on type
    if (tipo === "exame") {
      const { data: exam } = await supabaseAdmin
        .from("exams")
        .select("*, patients(email, full_name, id, user_id)")
        .eq("id", ref_id)
        .single();

      if (exam?.patients) {
        recipients = [{
          email: exam.patients.email,
          name: exam.patients.full_name,
          id: exam.patients.id
        }];
      }

      emailSubject = "Seu novo exame está disponível";
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 16px;">Olá ${recipients[0]?.name},</p>
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Seu novo exame está disponível no portal da clínica.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${projectUrl}/paciente/portal" 
               style="background: #5a3dff; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 16px;">
              Acessar meu portal
            </a>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            Este e-mail é automático. Não responda.
          </p>
        </div>
      `;
    } else if (tipo === "recomendacao") {
      const { data: recommendation } = await supabaseAdmin
        .from("recommendations")
        .select("*, patients(email, full_name, id, user_id)")
        .eq("id", ref_id)
        .single();

      if (recommendation?.patients) {
        recipients = [{
          email: recommendation.patients.email,
          name: recommendation.patients.full_name,
          id: recommendation.patients.id
        }];
      }

      emailSubject = "Você tem uma nova recomendação da médica";
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 16px;">Olá ${recipients[0]?.name},</p>
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Sua médica adicionou uma nova recomendação no seu portal.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${projectUrl}/paciente/portal" 
               style="background: #5a3dff; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 16px;">
              Ver recomendação
            </a>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            Este e-mail é automático. Não responda.
          </p>
        </div>
      `;
    } else if (tipo === "novidade") {
      destino = "todos";
      
      const { data: news } = await supabaseAdmin
        .from("clinic_news")
        .select("*")
        .eq("id", ref_id)
        .single();

      // Get all active patients with opt-in
      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("email, full_name, id, user_id")
        .eq("opt_in_novidades", true)
        .not("user_id", "is", null);

      if (patients) {
        recipients = patients.map(p => ({
          email: p.email,
          name: p.full_name,
          id: p.id
        }));
      }

      emailSubject = "Nova novidade no portal da clínica";
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 16px;">Olá,</p>
          <p style="color: #333; font-size: 16px; margin-bottom: 8px;">Temos uma nova novidade da clínica para você:</p>
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;"><strong>${news?.title}</strong></p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${projectUrl}/paciente/portal" 
               style="background: #5a3dff; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 16px;">
              Acessar o portal
            </a>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            Caso não queira mais receber novidades, acesse suas preferências no portal.
          </p>
        </div>
      `;
    }

    if (recipients.length === 0) {
      throw new Error("No recipients found");
    }

    console.log(`Sending ${tipo} notification to ${recipients.length} recipient(s)`);

    // Send emails
    const emailPromises = recipients.map(async (recipient) => {
      try {
        await resend.emails.send({
          from: "Dra. Luiza Aguera <noreply@agueradermatologia.com.br>",
          to: [recipient.email],
          subject: emailSubject,
          html: emailContent.replace(recipients[0]?.name || "", recipient.name),
        });

        // Log successful notification
        await supabaseAdmin.from("notifications").insert({
          tipo,
          destino,
          ref_id,
          paciente_id: tipo === "novidade" ? recipient.id : paciente_id,
          meio: "email",
          status: "enviado",
        });

        console.log(`Email sent successfully to ${recipient.email}`);
        return { success: true, email: recipient.email };
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        
        // Log failed notification
        await supabaseAdmin.from("notifications").insert({
          tipo,
          destino,
          ref_id,
          paciente_id: tipo === "novidade" ? recipient.id : paciente_id,
          meio: "email",
          status: "falha",
          error_message: error instanceof Error ? error.message : "Unknown error",
        });

        return { success: false, email: recipient.email, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Notification complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent: ${successCount} successful, ${failCount} failed`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-notification:", error);
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
