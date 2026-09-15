// Edge-compatible JWT & Crypto Utilities for Cloudflare Workers
import bcrypt from 'bcryptjs';

const DEFAULT_SECRET = 'gcs2-super-secure-jwt-key-2026';

function base64UrlEncode(str) {
  let b64;
  if (typeof btoa === 'function') {
    b64 = btoa(unescape(encodeURIComponent(str)));
  } else {
    b64 = Buffer.from(str).toString('base64');
  }
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlEncodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(b64)));
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}

async function getHmacKey(secret) {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || DEFAULT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function generateToken(payload, secret = DEFAULT_SECRET, expiresInSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const encodedSignature = base64UrlEncodeBuffer(signatureBuffer);

  return `${data}.${encodedSignature}`;
}

export async function verifyToken(token, secret = DEFAULT_SECRET) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret);
  const enc = new TextEncoder();

  // Convert base64url signature back to Uint8Array
  let b64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const sigBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    sigBytes[i] = binary.charCodeAt(i);
  }

  const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
  if (!isValid) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch (err) {
    return null;
  }
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}
