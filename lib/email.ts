/**
 * AquaFlow Email Utility
 * Uses Resend (https://resend.com) — free tier: 3,000 emails/month
 *
 * Setup: npm install resend
 *        Add RESEND_API_KEY to .env.local
 *        Add RESEND_FROM_EMAIL (e.g. "AquaFlow <orders@yourdomain.com>")
 *
 * Templates are inlined as string constants — no fs/path imports — so this
 * module works correctly on Vercel serverless / Edge runtimes where the
 * local filesystem is not reliably accessible at runtime.
 */

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  ?? "http://localhost:3000";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AquaFlow";
const FROM     = process.env.RESEND_FROM_EMAIL    ?? `${APP_NAME} <noreply@aquaflow.app>`;

// ─── Inlined HTML templates ───────────────────────────────────────────────────

const WELCOME_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *,::after,::before{box-sizing:border-box}
    body,html{margin:0;padding:0;width:100%}
    @media (max-width:600px){
      .email-wrapper{padding:16px !important}
      .email-body{padding:28px 20px !important}
      .btn-main{display:block !important;width:100% !important;text-align:center !important}
      .cred-table td{display:block !important;width:100% !important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">

<div style="display:none;max-height:0;overflow:hidden">Welcome to AquaFlow — pure water delivered to your door 💧</div>

<div class="email-wrapper" style="max-width:600px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding-bottom:24px">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#0ea5e9;border-radius:16px;padding:14px 20px;text-align:center">
              <span style="font-size:28px">💧</span>
              <div style="color:#fff;font-size:20px;font-weight:700;margin-top:4px;letter-spacing:-0.3px">AquaFlow</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Body card -->
  <table class="email-body" width="100%" cellpadding="0" cellspacing="0"
    style="background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 1px 3px rgba(0,0,0,.08)">

    <!-- Greeting -->
    <tr>
      <td style="padding-bottom:20px">
        <div style="font-size:26px;font-weight:800;color:#0f172a;line-height:1.2">
          Welcome, {{CUSTOMER_NAME}}! 🎉
        </div>
        <div style="font-size:15px;color:#64748b;margin-top:8px;line-height:1.6">
          Your AquaFlow account is ready. Enjoy fresh, pure water — delivered right to your door on your schedule.
        </div>
      </td>
    </tr>

    <!-- What you can do -->
    <tr>
      <td style="padding-bottom:28px">
        <div style="font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px">
          What you can do
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;vertical-align:top;font-size:20px">🛒</td>
                  <td style="padding-left:12px">
                    <div style="font-weight:600;color:#0f172a;font-size:14px">Place orders</div>
                    <div style="color:#64748b;font-size:13px;margin-top:2px">Choose your products, pick a delivery date &amp; time slot</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;vertical-align:top;font-size:20px">📍</td>
                  <td style="padding-left:12px">
                    <div style="font-weight:600;color:#0f172a;font-size:14px">Track deliveries</div>
                    <div style="color:#64748b;font-size:13px;margin-top:2px">Get real-time updates as your order reaches you</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;vertical-align:top;font-size:20px">🧴</td>
                  <td style="padding-left:12px">
                    <div style="font-weight:600;color:#0f172a;font-size:14px">Manage your bottles</div>
                    <div style="color:#64748b;font-size:13px;margin-top:2px">Track your bottle inventory and request refills easily</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Temp credentials block (only include when admin creates account) -->
    {{#if TEMP_PASSWORD}}
    <tr>
      <td style="padding-bottom:28px">
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;padding:20px">
          <div style="font-size:13px;font-weight:700;color:#854d0e;margin-bottom:12px">
            🔑 Your Login Credentials
          </div>
          <table class="cred-table" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;border-bottom:1px solid #fde047;font-size:13px;color:#713f12;width:40%">Email</td>
              <td style="padding:6px 0;border-bottom:1px solid #fde047;font-size:13px;font-weight:600;color:#0f172a">{{CUSTOMER_EMAIL}}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#713f12">Temp Password</td>
              <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;font-family:monospace">{{TEMP_PASSWORD}}</td>
            </tr>
          </table>
          <div style="margin-top:12px;font-size:12px;color:#92400e">
            ⚠ Please change your password after your first login for security.
          </div>
        </div>
      </td>
    </tr>
    {{/if TEMP_PASSWORD}}

    <!-- CTA -->
    <tr>
      <td align="center" style="padding-bottom:28px">
        <a class="btn-main" href="{{LOGIN_URL}}"
          style="display:inline-block;background:#0ea5e9;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;padding:14px 36px;letter-spacing:-.2px">
          Go to My Account →
        </a>
      </td>
    </tr>

    <!-- Help -->
    <tr>
      <td style="background:#f8fafc;border-radius:10px;padding:18px 20px">
        <div style="font-size:13px;color:#64748b;line-height:1.6">
          Need help? Reply to this email or contact us at
          <a href="mailto:{{SUPPORT_EMAIL}}" style="color:#0ea5e9;text-decoration:none">{{SUPPORT_EMAIL}}</a>.
          We typically respond within a few hours.
        </div>
      </td>
    </tr>

  </table>

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
    <tr>
      <td align="center">
        <div style="font-size:12px;color:#94a3b8;line-height:1.6">
          © {{YEAR}} AquaFlow. All rights reserved.<br>
          <a href="{{APP_URL}}" style="color:#94a3b8;text-decoration:underline">{{APP_URL}}</a>
        </div>
      </td>
    </tr>
  </table>

</div>
</body>
</html>`;

const ORDER_CONFIRMATION_TEMPLATE = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *,::after,::before{box-sizing:border-box}
    body,html{margin:0;padding:0;width:100%}
    table{border-collapse:collapse}
    td{padding:0}
    @media (max-width:600px){
      .email-wrapper{padding:16px !important}
      .email-body{padding:28px 20px !important}
      .btn-main{display:block !important;width:100% !important;text-align:center !important}
      .order-meta td{display:block !important;width:100% !important;border:none !important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">

<div style="display:none;max-height:0;overflow:hidden">Your order {{ORDER_NUMBER}} is confirmed — delivery on {{DELIVERY_DATE}} 💧</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9">
  <tr>
    <td align="center" class="email-wrapper" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px">

        <!-- Header -->
        <tr>
          <td style="background:#0f4c81;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 12px">
              <tr>
                <td style="background:#fff;border-radius:14px;width:56px;height:56px;text-align:center;line-height:56px;font-size:28px">💧</td>
              </tr>
            </table>
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff">AquaFlow</p>
            <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;letter-spacing:0.5px;text-transform:uppercase">Water Delivery Management</p>
          </td>
        </tr>

        <!-- Success banner -->
        <tr>
          <td style="background:#16a34a;padding:16px 40px;text-align:center">
            <p style="margin:0;font-size:15px;font-weight:600;color:#fff">✓ &nbsp;Order Confirmed!</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="email-body" style="background:#fff;padding:40px;color:#1e293b">

            <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a">Hi {{CUSTOMER_NAME}},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6">
              Great news — your water delivery order has been confirmed. Here's a summary of what's on its way.
            </p>

            <!-- Order meta -->
            <table class="order-meta" cellpadding="0" cellspacing="0" role="presentation" width="100%"
                   style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px">
              <tr>
                <td style="padding:16px 20px;border-right:1px solid #e2e8f0;width:50%">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Order Number</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#0f4c81">{{ORDER_NUMBER}}</p>
                </td>
                <td style="padding:16px 20px;width:50%">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Delivery Date</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a">{{DELIVERY_DATE}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Time Slot</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b">{{TIME_SLOT}}</p>
                </td>
                <td style="padding:16px 20px;border-top:1px solid #e2e8f0">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Payment</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b">{{PAYMENT_METHOD}}</p>
                </td>
              </tr>
            </table>

            <!-- Items -->
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0f172a">Order Items</p>
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
              <tr style="background:#f8fafc">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px">Item</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;text-align:center">Qty</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;text-align:right">Price</td>
              </tr>
              {{ITEMS_HTML}}
            </table>

            <!-- Totals -->
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px">
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#64748b">Subtotal</td>
                <td style="padding:4px 0;font-size:14px;color:#1e293b;text-align:right">PKR {{SUBTOTAL}}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#64748b">Delivery fee</td>
                <td style="padding:4px 0;font-size:14px;color:#1e293b;text-align:right">PKR {{DELIVERY_FEE}}</td>
              </tr>
              {{#if DISCOUNT}}
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#16a34a">Discount</td>
                <td style="padding:4px 0;font-size:14px;color:#16a34a;text-align:right">− PKR {{DISCOUNT}}</td>
              </tr>
              {{/if}}
              <tr>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#0f172a;border-top:2px solid #e2e8f0">Total</td>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#0f4c81;text-align:right;border-top:2px solid #e2e8f0">PKR {{TOTAL}}</td>
              </tr>
            </table>

            <!-- Delivery address -->
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%"
                   style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;margin-bottom:28px">
              <tr>
                <td style="padding:16px 20px">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.4px">📍 Delivery Address</p>
                  <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.5">{{ADDRESS}}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto">
              <tr>
                <td style="border-radius:10px;background:#0f4c81">
                  <a href="{{ORDER_URL}}"
                     class="btn-main"
                     style="display:inline-block;padding:13px 32px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;border-radius:10px">
                    📦 &nbsp;Track Your Order
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0 0 6px;font-size:13px;color:#64748b">Questions? Contact us by replying to this email.</p>
            <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">&copy; 2025 AquaFlow &nbsp;·&nbsp;
              <a href="{{APP_URL}}" style="color:#0f4c81;text-decoration:none">{{APP_URL}}</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

const DELIVERY_UPDATE_TEMPLATE = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *,::after,::before{box-sizing:border-box}
    body,html{margin:0;padding:0;width:100%}
    table{border-collapse:collapse}
    td{padding:0}
    @media (max-width:600px){
      .email-wrapper{padding:16px !important}
      .email-body{padding:28px 20px !important}
      .btn-main{display:block !important;width:100% !important;text-align:center !important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">

<div style="display:none;max-height:0;overflow:hidden">Your order {{ORDER_NUMBER}} is {{STATUS_LABEL}} {{STATUS_EMOJI}}</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9">
  <tr>
    <td align="center" class="email-wrapper" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px">

        <!-- Header -->
        <tr>
          <td style="background:#0f4c81;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 12px">
              <tr>
                <td style="background:#fff;border-radius:14px;width:56px;height:56px;text-align:center;line-height:56px;font-size:28px">💧</td>
              </tr>
            </table>
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff">AquaFlow</p>
            <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;letter-spacing:0.5px;text-transform:uppercase">Water Delivery Management</p>
          </td>
        </tr>

        <!-- Status banner -->
        <tr>
          <td style="background:{{STATUS_COLOR}};padding:16px 40px;text-align:center">
            <p style="margin:0;font-size:15px;font-weight:600;color:#fff">{{STATUS_EMOJI}} &nbsp;{{STATUS_LABEL}}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="email-body" style="background:#fff;padding:40px;color:#1e293b">

            <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a">Hi {{CUSTOMER_NAME}},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6">{{STATUS_MESSAGE}}</p>

            <!-- Order info card -->
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%"
                   style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px">
              <tr>
                <td style="padding:16px 20px;border-right:1px solid #e2e8f0;width:50%">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Order</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#0f4c81">{{ORDER_NUMBER}}</p>
                </td>
                <td style="padding:16px 20px;width:50%">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Delivery</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b">{{DELIVERY_DATE}}</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">{{TIME_SLOT}}</p>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:16px 20px;border-top:1px solid #e2e8f0">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Driver</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b">🚚 &nbsp;{{DRIVER_NAME}}</p>
                </td>
              </tr>
            </table>

            {{#if ITEMS_HTML}}
            <!-- Items delivered -->
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0f172a">Items Delivered</p>
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
              <tr style="background:#f8fafc">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px">Item</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;text-align:center">Qty</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;text-align:right">Price</td>
              </tr>
              {{ITEMS_HTML}}
            </table>
            {{/if}}

            <!-- Status timeline -->
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px">
              <tr>
                <td style="padding:8px 0">
                  <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tr>
                      <td width="24" style="vertical-align:top;padding-top:3px">
                        <div style="width:16px;height:16px;border-radius:50%;background:#16a34a;text-align:center;line-height:16px;font-size:10px;color:#fff">✓</div>
                      </td>
                      <td style="padding-left:12px;font-size:13px;color:#16a34a;font-weight:600">Order Confirmed</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 0 8px;border-left:2px solid #e2e8f0;height:12px">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:8px 0">
                  <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tr>
                      <td width="24" style="vertical-align:top;padding-top:3px">
                        <div style="width:16px;height:16px;border-radius:50%;background:#0f4c81;text-align:center;line-height:16px;font-size:10px;color:#fff">✓</div>
                      </td>
                      <td style="padding-left:12px;font-size:13px;color:#0f4c81;font-weight:600">Out for Delivery</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 0 8px;border-left:2px dashed #e2e8f0;height:12px">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:8px 0">
                  <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tr>
                      <td width="24" style="vertical-align:top;padding-top:3px">
                        <div style="width:16px;height:16px;border-radius:50%;background:#e2e8f0;text-align:center;line-height:16px;font-size:10px;color:#94a3b8">○</div>
                      </td>
                      <td style="padding-left:12px;font-size:13px;color:#94a3b8">Delivered</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto">
              <tr>
                <td style="border-radius:10px;background:#0f4c81">
                  <a href="{{ORDER_URL}}" class="btn-main"
                     style="display:inline-block;padding:13px 32px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;border-radius:10px">
                    📍 &nbsp;Track Order
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0 0 6px;font-size:13px;color:#64748b">Questions? Reply to this email or contact your driver.</p>
            <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">&copy; 2025 AquaFlow &nbsp;·&nbsp;
              <a href="{{APP_URL}}" style="color:#0f4c81;text-decoration:none">{{APP_URL}}</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

// ─── Template renderer ────────────────────────────────────────────────────────

function render(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  // Replace remaining {{APP_URL}} tokens
  out = out.replaceAll("{{APP_URL}}", APP_URL);
  return out;
}

// ─── Send helper ─────────────────────────────────────────────────────────────

async function send({ to, subject, html }: { to: string; subject: string; html: string }) {
  // Lazy-import so the build doesn't fail if resend isn't installed yet
  const { Resend } = await import("resend").catch(() => {
    throw new Error("resend package not installed. Run: npm install resend");
  });

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}

// ─── Welcome / onboarding email ──────────────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to:            string;
  customerName:  string;
  tempPassword?: string;  // only for admin-created accounts; omit for self-registered
}) {
  let html = render(WELCOME_TEMPLATE, {
    CUSTOMER_NAME:  params.customerName,
    CUSTOMER_EMAIL: params.to,
    LOGIN_URL:      `${APP_URL}/login`,
    SUPPORT_EMAIL:  process.env.SUPPORT_EMAIL ?? "support@aquaflow.pk",
    TEMP_PASSWORD:  params.tempPassword ?? "",
    YEAR:           new Date().getFullYear().toString(),
  });

  // Handle simple {{#if TEMP_PASSWORD}} ... {{/if TEMP_PASSWORD}} blocks
  if (params.tempPassword) {
    html = html.replace(/\{\{#if TEMP_PASSWORD\}\}\s*/g, "").replace(/\s*\{\{\/if TEMP_PASSWORD\}\}/g, "");
  } else {
    html = html.replace(/\{\{#if TEMP_PASSWORD\}\}[\s\S]*?\{\{\/if TEMP_PASSWORD\}\}/g, "");
  }

  try {
    await send({
      to:      params.to,
      subject: `Welcome to AquaFlow, ${params.customerName}! 💧`,
      html,
    });
  } catch (err) {
    // Log but don't throw — welcome email failure must not block registration
    console.error("[email] sendWelcomeEmail failed:", err);
  }
}

// ─── Order confirmation ───────────────────────────────────────────────────────

export async function sendOrderConfirmation(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  deliveryDate: string;
  timeSlot: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  address: string;
  paymentMethod: string;
}) {
  const itemsHtml = params.items
    .map(
      (item, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
        <td style="padding:10px 16px;font-size:14px;color:#1e293b">${item.name}</td>
        <td style="padding:10px 16px;font-size:14px;color:#1e293b;text-align:center">${item.quantity}</td>
        <td style="padding:10px 16px;font-size:14px;color:#1e293b;text-align:right">PKR ${(item.quantity * item.unitPrice).toFixed(0)}</td>
      </tr>`
    )
    .join("");

  const discountStr = params.discount > 0 ? params.discount.toFixed(0) : "";
  let html = render(ORDER_CONFIRMATION_TEMPLATE, {
    CUSTOMER_NAME:  params.customerName,
    ORDER_NUMBER:   params.orderNumber,
    DELIVERY_DATE:  params.deliveryDate,
    TIME_SLOT:      params.timeSlot,
    ITEMS_HTML:     itemsHtml,
    SUBTOTAL:       params.subtotal.toFixed(0),
    DELIVERY_FEE:   params.deliveryFee.toFixed(0),
    DISCOUNT:       discountStr,
    TOTAL:          params.total.toFixed(0),
    ADDRESS:        params.address,
    PAYMENT_METHOD: params.paymentMethod,
    ORDER_URL:      `${APP_URL}/my-orders`,
  });

  // Handle {{#if DISCOUNT}} ... {{/if}} blocks
  if (params.discount > 0) {
    html = html.replace(/\{\{#if DISCOUNT\}\}\s*/g, "").replace(/\s*\{\{\/if\}\}/g, "");
  } else {
    html = html.replace(/\{\{#if DISCOUNT\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  await send({
    to: params.to,
    subject: `✓ Order ${params.orderNumber} Confirmed — AquaFlow`,
    html,
  });
}

// ─── Delivery status update ───────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; emoji: string; color: string; message: string }> = {
  dispatched: {
    label:   "Out for Delivery",
    emoji:   "🚚",
    color:   "#2563eb",
    message: "Your order has been packed and is on its way to you. Our driver will arrive during your selected time slot.",
  },
  en_route: {
    label:   "Almost There!",
    emoji:   "📍",
    color:   "#7c3aed",
    message: "Your driver is nearby. Please make sure someone is available to receive the delivery.",
  },
  delivered: {
    label:   "Delivered Successfully",
    emoji:   "✅",
    color:   "#16a34a",
    message: "Your water delivery has been completed. Thank you for choosing AquaFlow!",
  },
  failed: {
    label:   "Delivery Attempt Failed",
    emoji:   "⚠️",
    color:   "#dc2626",
    message: "We were unable to complete your delivery. Our team will contact you to reschedule.",
  },
};

export async function sendDeliveryUpdate(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  status: string;
  driverName: string;
  deliveryDate: string;
  timeSlot: string;
  items?: Array<{ name: string; quantity: number; unitPrice: number }>;
}) {
  const meta = STATUS_META[params.status];
  if (!meta) return; // Don't send for statuses without a template

  const itemsHtml = (params.items ?? [])
    .map(
      (item, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
        <td style="padding:10px 16px;font-size:14px;color:#1e293b">${item.name}</td>
        <td style="padding:10px 16px;font-size:14px;color:#1e293b;text-align:center">${item.quantity}</td>
        <td style="padding:10px 16px;font-size:14px;color:#1e293b;text-align:right">PKR ${(item.quantity * item.unitPrice).toFixed(0)}</td>
      </tr>`
    )
    .join("");

  let html = render(DELIVERY_UPDATE_TEMPLATE, {
    CUSTOMER_NAME:  params.customerName,
    ORDER_NUMBER:   params.orderNumber,
    STATUS_LABEL:   meta.label,
    STATUS_EMOJI:   meta.emoji,
    STATUS_COLOR:   meta.color,
    STATUS_MESSAGE: meta.message,
    DRIVER_NAME:    params.driverName,
    DELIVERY_DATE:  params.deliveryDate,
    TIME_SLOT:      params.timeSlot,
    ITEMS_HTML:     itemsHtml,
    ORDER_URL:      `${APP_URL}/my-orders`,
  });

  // Handle {{#if ITEMS_HTML}} ... {{/if}} block
  if (itemsHtml) {
    html = html.replace(/\{\{#if ITEMS_HTML\}\}\s*/g, "").replace(/\s*\{\{\/if\}\}/g, "");
  } else {
    html = html.replace(/\{\{#if ITEMS_HTML\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  await send({
    to: params.to,
    subject: `${meta.emoji} Order ${params.orderNumber} — ${meta.label}`,
    html,
  });
}
