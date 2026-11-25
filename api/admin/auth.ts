import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

const COOKIE_NAME = 'aaroha_admin_session'
const SESSION_SECONDS = 60 * 60 * 8
type AuthRequest = IncomingMessage & { body?: unknown }

function json(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(body))
}

function constantTimeEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? ''
  return secret.length >= 32 ? secret : ''
}

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function cookieValue(req: AuthRequest) {
  const cookieHeader = req.headers.cookie ?? ''
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))
  return entry?.slice(COOKIE_NAME.length + 1) ?? ''
}

function hasValidSession(req: AuthRequest) {
  const secret = sessionSecret()
  const [payload, suppliedSignature] = cookieValue(req).split('.')
  if (!secret || !payload || !suppliedSignature) return false
  if (!constantTimeEqual(suppliedSignature, signature(payload, secret))) return false
  try {
    const [email, expiresAt] = Buffer.from(payload, 'base64url').toString('utf8').split('|')
    return email === (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase() && Number(expiresAt) > Date.now()
  } catch {
    return false
  }
}

async function requestBody(req: AuthRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>
  if (typeof req.body === 'string') return JSON.parse(req.body) as Record<string, unknown>
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

function setSessionCookie(res: ServerResponse, value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`)
}

export default async function handler(req: AuthRequest, res: ServerResponse) {
  const secret = sessionSecret()
  const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  if (!secret || !adminEmail || !adminPassword) {
    return json(res, 503, { error: 'Admin sign-in is not configured.' })
  }

  if (req.method === 'GET') return json(res, 200, { authenticated: hasValidSession(req) })
  if (req.method === 'DELETE') {
    setSessionCookie(res, '', 0)
    return json(res, 200, { authenticated: false })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, DELETE')
    return json(res, 405, { error: 'Method not allowed.' })
  }

  let body: Record<string, unknown>
  try {
    body = await requestBody(req)
  } catch {
    return json(res, 400, { error: 'Enter your email and password.' })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!constantTimeEqual(email, adminEmail) || !constantTimeEqual(password, adminPassword)) {
    return json(res, 401, { error: 'The email or password is incorrect.' })
  }

  const expiresAt = Date.now() + SESSION_SECONDS * 1000
  const payload = Buffer.from(`${adminEmail}|${expiresAt}`).toString('base64url')
  setSessionCookie(res, `${payload}.${signature(payload, secret)}`, SESSION_SECONDS)
  return json(res, 200, { authenticated: true })
}
