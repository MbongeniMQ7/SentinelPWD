import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://sentinel-ai.app";
const TEMP_PASSWORD = "Sentinel@Temp1!";

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

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to SentinelAI</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f2f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
         style="background-color:#f0f2f7;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;
                      box-shadow:0 8px 32px -8px rgba(20,30,60,0.18);">

          <!-- ── Header ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a2240 0%,#252f55 100%);padding:40px 40px 32px;text-align:center;">

              <!-- Shield icon (SVG inline) -->
              <div style="display:inline-block;background:rgba(255,255,255,0.08);border-radius:50%;padding:16px;margin-bottom:20px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L3 6V12C3 16.97 7.02 21.61 12 23C16.98 21.61 21 16.97 21 12V6L12 2Z"
                        fill="#e8b85a" stroke="#e8b85a" stroke-width="0.5"/>
                  <path d="M9 12L11 14L15 10" stroke="#1a2240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <h1 style="margin:0;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">
                SentinelAI
              </h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.55);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">
                Smart Workforce Intelligence
              </p>
            </td>
          </tr>

          <!-- ── Gold accent bar ── -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#e8b85a,#d4982a,#e8b85a);"></td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#e8b85a;letter-spacing:1.2px;text-transform:uppercase;">
                Welcome aboard
              </p>
              <h2 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#141e3c;line-height:1.3;">
                Hi ${fullName},
              </h2>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3c4a6e;">
                You've been added to the <strong style="color:#141e3c;">${companyName}</strong> workforce 
                on <strong style="color:#141e3c;">SentinelAI</strong> as a <strong style="color:#141e3c;">${roleLabel}</strong>. 
                Use the credentials below to sign in and set up your account.
              </p>

              <!-- Credentials box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background-color:#f5f7fb;border-radius:14px;border:1px solid #e6eaf5;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8a95b8;letter-spacing:1.2px;text-transform:uppercase;">
                      Your login credentials
                    </p>

                    <!-- Email row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                           style="margin-top:16px;">
                      <tr>
                        <td style="padding:12px 16px;background:#ffffff;border-radius:10px;border:1px solid #e2e6f0;">
                          <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#8a95b8;text-transform:uppercase;letter-spacing:0.8px;">
                            Email
                          </p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#141e3c;word-break:break-all;">
                            ${payload.email}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Password row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                           style="margin-top:10px;">
                      <tr>
                        <td style="padding:12px 16px;background:#ffffff;border-radius:10px;border:1px solid #e2e6f0;">
                          <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#8a95b8;text-transform:uppercase;letter-spacing:0.8px;">
                            Temporary Password
                          </p>
                          <p style="margin:0;font-size:18px;font-weight:900;color:#141e3c;letter-spacing:2px;font-family:'Courier New',monospace;">
                            ${TEMP_PASSWORD}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Warning note -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                           style="margin-top:12px;">
                      <tr>
                        <td style="padding:10px 14px;background:#fff8ec;border-radius:8px;border:1px solid #f0d89a;">
                          <p style="margin:0;font-size:12px;color:#7a5a18;line-height:1.5;">
                            <strong>⚠ Security notice:</strong> You will be asked to create a new password on your first login. 
                            Do not share these credentials with anyone.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}"
                       style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#1a2240,#252f55);
                              color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;
                              border-radius:14px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(20,30,64,0.25);">
                      Sign In &amp; Set Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background:#f5f7fb;border-radius:14px;border:1px solid #e6eaf5;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#8a95b8;letter-spacing:1.2px;text-transform:uppercase;">
                      Getting started
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <span style="display:inline-block;width:22px;height:22px;background:#e8b85a;border-radius:50%;
                                       font-size:11px;font-weight:800;color:#141e3c;text-align:center;line-height:22px;margin-right:10px;">1</span>
                        </td>
                        <td style="padding:6px 0;">
                          <span style="font-size:13px;color:#3c4a6e;line-height:1.5;">Click <strong style="color:#141e3c;">Sign In &amp; Set Password</strong> above</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <span style="display:inline-block;width:22px;height:22px;background:#e8b85a;border-radius:50%;
                                       font-size:11px;font-weight:800;color:#141e3c;text-align:center;line-height:22px;margin-right:10px;">2</span>
                        </td>
                        <td style="padding:6px 0;">
                          <span style="font-size:13px;color:#3c4a6e;line-height:1.5;">Log in with your email and the temporary password</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <span style="display:inline-block;width:22px;height:22px;background:#e8b85a;border-radius:50%;
                                       font-size:11px;font-weight:800;color:#141e3c;text-align:center;line-height:22px;margin-right:10px;">3</span>
                        </td>
                        <td style="padding:6px 0;">
                          <span style="font-size:13px;color:#3c4a6e;line-height:1.5;">You'll be prompted to <strong style="color:#141e3c;">create a new secure password</strong></span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <span style="display:inline-block;width:22px;height:22px;background:#e8b85a;border-radius:50%;
                                       font-size:11px;font-weight:800;color:#141e3c;text-align:center;line-height:22px;margin-right:10px;">4</span>
                        </td>
                        <td style="padding:6px 0;">
                          <span style="font-size:13px;color:#3c4a6e;line-height:1.5;">Start using the SentinelAI workforce dashboard</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #e6eaf5;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#8a95b8;line-height:1.6;">
                This email was sent by <strong style="color:#3c4a6e;">SentinelAI</strong> on behalf of 
                <strong style="color:#3c4a6e;">${companyName}</strong>.
              </p>
              <p style="margin:0;font-size:11px;color:#b0b8d4;">
                If you did not expect this email, please contact your system administrator.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

        <p style="margin:20px 0 0;font-size:11px;color:#9ca3b8;text-align:center;">
          &copy; ${new Date().getFullYear()} SentinelAI &mdash; Smart Workforce Intelligence Platform
        </p>

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
