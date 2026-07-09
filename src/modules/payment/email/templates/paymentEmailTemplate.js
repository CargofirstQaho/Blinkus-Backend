
export function paymentEmailTemplate({ greeting, title, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e8e8;">

          <tr>
            <td style="background:#000000;padding:32px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Blinkus</span>
              <span style="color:#22c55e;font-size:13px;display:block;margin-top:4px;font-weight:500;letter-spacing:1px;text-transform:uppercase;">Intelligence Engine</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#666666;line-height:1.6;">${greeting}</p>
              <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#0a0a0a;letter-spacing:-0.5px;">${title}</h1>
              <div style="font-size:15px;color:#444444;line-height:1.7;">
                ${body}
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#f8f8f8;padding:20px 40px;border-top:1px solid #e8e8e8;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;text-align:center;">
                &copy; ${new Date().getFullYear()} Blinkus &mdash; The Intelligence Engine for Global Trade
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
