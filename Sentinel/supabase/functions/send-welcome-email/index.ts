import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://sentinelai-sofware.vercel.app";
const TEMP_PASSWORD = "Sentinel@Temp1!";

// Logo hosted on the Vercel deployment — accessible to all email clients
const LOGO_URL = `${APP_URL}/logo.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WelcomeEmailPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: "EMPLOYEE" | "MANAGER";
  companyName: string;
}

function buildEmail(payload: WelcomeEmailPayload): string {
  const { firstName, lastName, role, companyName } = payload;
  const fullName = `${firstName} ${lastName}`;
  const roleLabel = role === "MANAGER" ? "Manager" : "Employee";
  const loginUrl = `${APP_URL}/choose-role`;
  const year = new Date().getFullYear();

  return /* html */ `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Welcome to SentinelAI Workforce</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#eef1f8;font-family:'Segoe UI',Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- PREHEADER TEXT (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Welcome to SentinelAI, ${firstName}! Your account is ready — sign in and set your password to get started.
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- OUTER WRAPPER -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
         style="background-color:#eef1f8;padding:40px 16px 48px;">
    <tr>
      <td align="center">

        <!-- CARD -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="max-width:580px;background-color:#ffffff;border-radius:24px;overflow:hidden;
                      box-shadow:0 12px 48px -8px rgba(20,30,60,0.16);">

          <!-- ───────────── HEADER ───────────── -->
          <tr>
            <td style="background:linear-gradient(150deg,#101828 0%,#1e2d55 60%,#253368 100%);padding:44px 48px 36px;text-align:center;">

              <!-- Logo -->
              <img src="${LOGO_URL}"
                   alt="SentinelAI"
                   width="64" height="64"
                   style="display:block;margin:0 auto 20px;border-radius:16px;border:2px solid rgba(232,184,90,0.35);" />

              <h1 style="margin:0 0 6px;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.15;">
                SentinelAI
              </h1>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;font-weight:600;">
                Smart Workforce Intelligence
              </p>
            </td>
          </tr>

          <!-- Gold divider -->
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,#c8922a 0%,#e8b85a 40%,#f0cc7a 60%,#e8b85a 80%,#c8922a 100%);"></td>
          </tr>

          <!-- ───────────── HERO GREETING ───────────── -->
          <tr>
            <td style="padding:40px 48px 0;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#c8922a;letter-spacing:1.8px;text-transform:uppercase;">
                You're officially onboarded
              </p>
              <h2 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#101828;line-height:1.25;">
                Welcome, ${firstName}!
              </h2>
              <p style="margin:0;font-size:15px;line-height:1.8;color:#445178;">
                Your <strong style="color:#101828;">SentinelAI</strong> account has been created for 
                <strong style="color:#101828;">${companyName}</strong>. You've been assigned the role of 
                <strong style="color:#101828;">${roleLabel}</strong>. Use the credentials below to 
                sign in and create your personal password.
              </p>
            </td>
          </tr>

          <!-- ───────────── CREDENTIALS CARD ───────────── -->
          <tr>
            <td style="padding:28px 48px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background:#f6f8fd;border-radius:16px;border:1px solid #dde3f5;">
                <tr>
                  <td style="padding:28px;">

                    <p style="margin:0 0 18px;font-size:11px;font-weight:700;color:#8a95b8;letter-spacing:1.5px;text-transform:uppercase;">
                      Your Login Credentials
                    </p>

                    <!-- Email field -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                           style="margin-bottom:10px;">
                      <tr>
                        <td style="padding:14px 18px;background:#ffffff;border-radius:12px;border:1px solid #e0e5f2;">
                          <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#a0aac8;letter-spacing:1.2px;text-transform:uppercase;">Email Address</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#101828;word-break:break-all;">${payload.email}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Password field -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                           style="margin-bottom:14px;">
                      <tr>
                        <td style="padding:14px 18px;background:#ffffff;border-radius:12px;border:1px solid #e0e5f2;">
                          <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#a0aac8;letter-spacing:1.2px;text-transform:uppercase;">Temporary Password</p>
                          <p style="margin:0;font-size:20px;font-weight:800;color:#101828;letter-spacing:3px;font-family:'Courier New',Courier,monospace;">${TEMP_PASSWORD}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Security notice -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:12px 16px;background:#fffbf0;border-radius:10px;border:1px solid #f0d898;border-left:4px solid #e8b85a;">
                          <p style="margin:0;font-size:12px;color:#7a5820;line-height:1.6;">
                            <strong>&#9888;&#65039; Security Notice:</strong> You will be required to create a new password immediately after your first sign-in. Keep this email confidential and do not share these credentials.
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ───────────── CTA BUTTON ───────────── -->
          <tr>
            <td style="padding:32px 48px 0;text-align:center;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="${loginUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="20%" stroke="f"
                fillcolor="#101828">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:800;">Sign In &amp; Set Password</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${loginUrl}"
                 style="display:inline-block;padding:17px 48px;
                        background:linear-gradient(135deg,#101828 0%,#1e2d55 100%);
                        color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;
                        border-radius:14px;letter-spacing:0.4px;
                        box-shadow:0 6px 20px rgba(16,24,40,0.30);
                        border:1.5px solid rgba(232,184,90,0.30);">
                &#128274;&nbsp; Sign In &amp; Set Password
              </a>
              <!--<![endif]-->
              <p style="margin:14px 0 0;font-size:12px;color:#8a95b8;">
                Or copy &amp; paste this link into your browser:<br />
                <a href="${loginUrl}" style="color:#c8922a;word-break:break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>

          <!-- ───────────── STEPS ───────────── -->
          <tr>
            <td style="padding:32px 48px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background:#f6f8fd;border-radius:16px;border:1px solid #dde3f5;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 18px;font-size:11px;font-weight:700;color:#8a95b8;letter-spacing:1.5px;text-transform:uppercase;">
                      Getting Started — 4 Steps
                    </p>
                    ${[
                      ["Click <strong style='color:#101828'>Sign In &amp; Set Password</strong> above", ""],
                      ["Enter your email and the <strong style='color:#101828'>temporary password</strong>", ""],
                      ["Create your new <strong style='color:#101828'>personal password</strong> when prompted", ""],
                      ["Access your personalised <strong style='color:#101828'>SentinelAI dashboard</strong>", ""],
                    ].map(([text], i) => `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                           style="margin-bottom:${i < 3 ? "12px" : "0"};">
                      <tr>
                        <td width="32" style="vertical-align:top;padding-top:1px;">
                          <span style="display:inline-block;width:26px;height:26px;background:linear-gradient(135deg,#c8922a,#e8b85a);
                                       border-radius:50%;font-size:12px;font-weight:800;color:#101828;
                                       text-align:center;line-height:26px;">${i + 1}</span>
                        </td>
                        <td style="padding-left:12px;font-size:13px;color:#445178;line-height:1.6;">${text}</td>
                      </tr>
                    </table>`).join("")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ───────────── DIVIDER ───────────── -->
          <tr>
            <td style="padding:36px 48px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:1px;background:#e8ecf5;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ───────────── FOOTER ───────────── -->
          <tr>
            <td style="padding:24px 48px 40px;text-align:center;">

              <!-- Small logo repeat -->
              <img src="${LOGO_URL}" alt="SentinelAI" width="36" height="36"
                   style="display:block;margin:0 auto 12px;border-radius:8px;opacity:0.6;" />

              <p style="margin:0 0 8px;font-size:13px;color:#6b7a9e;line-height:1.6;">
                This email was sent by <strong style="color:#445178;">SentinelAI</strong> on behalf of 
                <strong style="color:#445178;">${companyName}</strong>.
              </p>
              <p style="margin:0 0 16px;font-size:12px;color:#a0aac8;line-height:1.5;">
                If you were not expecting this invitation, please contact your system administrator immediately.
              </p>
              <p style="margin:0;font-size:11px;color:#c0c8dc;">
                &copy; ${year} SentinelAI &mdash; Smart Workforce Intelligence Platform<br />
                <a href="${APP_URL}" style="color:#c8922a;text-decoration:none;">${APP_URL}</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /CARD -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as WelcomeEmailPayload;

    if (!payload.email || !payload.firstName || !payload.lastName || !payload.companyName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleLabel = payload.role === "MANAGER" ? "Manager" : "Employee";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SentinelAI <noreply@mmqtech.co.za>",
        to: [payload.email],
        subject: `You've been added to ${payload.companyName} on SentinelAI`,
        html: buildEmail(payload),
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error("Resend API error:", errorBody);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: errorBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await resendResponse.json();
    console.log(`Welcome email sent to ${payload.email} (${roleLabel}), id: ${result.id}`);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
