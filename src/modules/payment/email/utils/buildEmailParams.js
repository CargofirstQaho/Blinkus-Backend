
export function buildEmailParams({ to, subject, html }) {
  return {
    Source: process.env.AWS_SES_FROM_ADDRESS,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Subject: {
        Data:    subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data:    html,
          Charset: 'UTF-8',
        },
      },
    },
  };
}

export function buildRawMime({ from, to, subject, html, attachments = [] }) {
  const boundary = `blinkus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  const toLine   = Array.isArray(to) ? to.join(', ') : to;
  const wrapB64  = (s) => (s.match(/.{1,76}/g) ?? [s]).join('\r\n');

  const parts = [
    `From: ${from}`,
    `To: ${toLine}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapB64(Buffer.from(html, 'utf8').toString('base64')),
    '',
  ];

  for (const att of attachments) {
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
    parts.push('Content-Transfer-Encoding: base64');
    parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    parts.push('');
    parts.push(wrapB64(att.content.toString('base64')));
    parts.push('');
  }

  parts.push(`--${boundary}--`);

  return Buffer.from(parts.join('\r\n'), 'utf8');
}
