import { UAParser } from 'ua-parser-js';

export function getClientIp(req) {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  let ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.socket?.remoteAddress || req.ip;

  if (!ip) return null;
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';

  return ip;
}

export function getDeviceInfo(userAgent) {
  const result = new UAParser(userAgent || '').getResult();

  return {
    browser: result.browser?.name || 'Unknown',
    operatingSystem: result.os?.name || 'Unknown',
    deviceType: result.device?.type ? capitalize(result.device.type) : 'Desktop',
  };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function extractRequestContext(req) {
  const userAgent = req.headers?.['user-agent'] || '';
  const { browser, operatingSystem, deviceType } = getDeviceInfo(userAgent);
 
  return {
    ipAddress: getClientIp(req),
    userAgent,
    browser,
    operatingSystem,
    deviceType,
    requestMethod: req.method,
    requestUrl: req.originalUrl,
  };
}
