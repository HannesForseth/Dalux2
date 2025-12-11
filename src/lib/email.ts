import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dalux2-1xcz.vercel.app'
const FROM_EMAIL = process.env.EMAIL_FROM || 'Dalux Portal <onboarding@resend.dev>'

interface SendInvitationEmailParams {
  to: string
  token: string
  projectName: string
  inviterName: string
  roleName: string
}

export async function sendInvitationEmail({
  to,
  token,
  projectName,
  inviterName,
  roleName,
}: SendInvitationEmailParams) {
  const inviteUrl = `${APP_URL}/invite/${token}`

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `Du har bjudits in till ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Projektinbjudan</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Dalux Portal</h1>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Du har bjudits in till ett projekt!</h2>

            <p style="color: #4b5563;">
              <strong>${inviterName}</strong> har bjudit in dig att gå med i projektet <strong>${projectName}</strong> som <strong>${roleName}</strong>.
            </p>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${inviteUrl}" style="display: inline-block; background: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Acceptera inbjudan
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              Om du inte har ett konto kommer du att kunna skapa ett när du accepterar inbjudan.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              Om du inte förväntade dig denna inbjudan kan du ignorera detta e-postmeddelande.
              <br><br>
              Denna inbjudan gäller i 7 dagar.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Du har bjudits in till ${projectName}!

${inviterName} har bjudit in dig att gå med i projektet ${projectName} som ${roleName}.

Klicka på länken nedan för att acceptera inbjudan:
${inviteUrl}

Om du inte har ett konto kommer du att kunna skapa ett när du accepterar inbjudan.

Denna inbjudan gäller i 7 dagar.
    `,
  })

  if (error) {
    console.error('Failed to send invitation email:', error)
    throw new Error('Kunde inte skicka inbjudningsmail')
  }

  return data
}
