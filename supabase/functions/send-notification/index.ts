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

      emailSubject = "Novo exame disponível no seu portal";
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Novo exame disponível!</h2>
          <p>Olá ${recipients[0]?.name},</p>
          <p>Um novo exame está disponível no seu portal.</p>
          <p><strong>${exam?.title}</strong></p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${projectUrl}/paciente/portal" 
               style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Acessar Meu Portal
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Dra. Luiza Aguera - Dermatologia<br>
            Este é um email automático, por favor não responda.
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

      emailSubject = "Nova recomendação da médica disponível";
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Você recebeu uma nova recomendação!</h2>
          <p>Olá ${recipients[0]?.name},</p>
          <p>A Dra. Luiza Aguera enviou uma nova recomendação para você.</p>
          <p><strong>${recommendation?.title}</strong></p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${projectUrl}/paciente/portal" 
               style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Acessar Minhas Recomendações
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Dra. Luiza Aguera - Dermatologia<br>
            Este é um email automático, por favor não responda.
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

      emailSubject = "Nova novidade da clínica disponível!";
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nova publicação da clínica!</h2>
          <p>Olá,</p>
          <p>Confira a nova novidade publicada pela clínica:</p>
          <p><strong>${news?.title}</strong></p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${projectUrl}/paciente/portal" 
               style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Ver Novidades
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Dra. Luiza Aguera - Dermatologia<br>
            Este é um email automático, por favor não responda.
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
