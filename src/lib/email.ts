/**
 * Utility for sending emails
 * In production, integrate with Resend, SendGrid, or similar
 * For now, logs to console and returns success
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log("=== EMAIL SEND ===");
  console.log("To:", options.to);
  console.log("Subject:", options.subject);
  console.log("HTML Length:", options.html.length, "chars");
  if (options.attachments) {
    console.log("Attachments:", options.attachments.map(a => a.filename).join(", "));
  }
  console.log("==================");
  
  // In production, use actual email service:
  // const resend = new Resend('re_123456789');
  // return resend.emails.send(options);
  
  return { success: true, messageId: `msg_${Date.now()}` };
}

export function generateWelcomeEmail(
  empresaNombre: string,
  empresaRif: string,
  adminEmail: string,
  plan: string,
  meses: number
): EmailOptions {
  const subject = `✅ Bienvenido a Nómina Venezuela - Licencia Activada`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #0047AB; color: #fff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 24px; }
    .info-box { background: #f0f7ff; border: 1px solid #0047AB; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #333; }
    .value { color: #0047AB; }
    .btn { display: inline-block; background: #0047AB; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
    .footer { background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nómina Venezuela</h1>
    </div>
    <div class="content">
      <p>Estimado/a Administrador/a de <strong>${empresaNombre}</strong>,</p>
      
      <p>🎉 <strong>¡Su licencia ha sido activada exitosamente!</strong></p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="label">Empresa:</span>
          <span class="value">${empresaNombre}</span>
        </div>
        <div class="info-row">
          <span class="label">RIF:</span>
          <span class="value">${empresaRif}</span>
        </div>
        <div class="info-row">
          <span class="label">Plan:</span>
          <span class="value" style="text-transform: capitalize;">${plan}</span>
        </div>
        <div class="info-row">
          <span class="label">Período:</span>
          <span class="value">${meses} mes${meses > 1 ? "es" : ""}</span>
        </div>
      </div>
      
      <h3>📋 Manual de Usuario Incluido</h3>
      <p>Encontrará adjunto a este correo el <strong>Manual de Usuario en PDF</strong> con las siguientes secciones:</p>
      <ul>
        <li>Introducción y configuración inicial</li>
        <li>Gestión de trabajadores</li>
        <li>Procesamiento de nómina</li>
        <li>Cálculos legales (LOTTT)</li>
        <li>Reportes y exportaciones</li>
      </ul>
      
      <p>Puede comenzar a usar el sistema accediendo a:</p>
      <p style="text-align: center;">
        <a href="https://nomina.venezuela.example.com" class="btn">Ir a Nómina Venezuela</a>
      </p>
      
      <p style="margin-top: 24px; color: #666; font-size: 14px;">
        ¿Necesita ayuda? Responda a este correo o contacte a nuestro equipo de soporte.
      </p>
    </div>
    <div class="footer">
      <p>© 2024 Nómina Venezuela - Sistema de Nómina Legal Venezolano</p>
      <p>Este correo fue enviado a ${adminEmail}</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    to: adminEmail,
    subject,
    html,
    attachments: [
      {
        filename: "Manual_Usuario_Nomina_Venezuela.pdf",
        content: "PDF_BASE64_CONTENT_WOULD_BE_HERE",
        contentType: "application/pdf",
      },
    ],
  };
}

export function generateLicenseExpirationEmail(
  empresaNombre: string,
  adminEmail: string,
  diasRestantes: number
): EmailOptions {
  const subject = `⏰ Su licencia de Nómina Venezuela vence en ${diasRestantes} día${diasRestantes > 1 ? "s" : ""}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #f59e0b; color: #fff; padding: 24px; text-align: center; }
    .content { padding: 24px; }
    .alert { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .btn { display: inline-block; background: #0047AB; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 8px 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Recordatorio de Renovación</h1>
    </div>
    <div class="content">
      <p>Estimado/a Administrador/a de <strong>${empresaNombre}</strong>,</p>
      
      <div class="alert">
        <strong>⚠️ Su licencia vence en ${diasRestantes} día${diasRestantes > 1 ? "s" : ""}</strong>
      </div>
      
      <p>Para continuar usando Nómina Venezuela sin interrupciones, por favor renueve su licencia.</p>
      
      <p style="text-align: center;">
        <a href="https://nomina.venezuela.example.com/dashboard/configuracion" class="btn">Renovar Licencia</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    to: adminEmail,
    subject,
    html,
  };
}
