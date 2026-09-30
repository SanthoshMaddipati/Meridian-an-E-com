import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const tokenSecret = process.env.AUTH_SECRET || randomBytes(32).toString('hex');

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  return { salt, hash };
}

export async function verifyPassword(password, salt, expectedHash) {
  const actual = Buffer.from((await scrypt(password, salt, 64)).toString('hex'), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 604800 })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac('sha256', tokenSecret).update(unsigned).digest('base64url')}`;
}

export function readToken(token) {
  const [header, payload, signature] = String(token || '').split('.');
  if (!header || !payload || !signature) return null;
  const unsigned = `${header}.${payload}`;
  const expected = createHmac('sha256', tokenSecret).update(unsigned).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return claims.sub && claims.exp > Math.floor(Date.now() / 1000) ? claims : null;
  } catch { return null; }
}

export function requireAuth(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const claims = readToken(token);
  if (!claims) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.userId = claims.sub;
  return next();
}
