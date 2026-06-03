import { compare, hash } from 'bcryptjs'
import { sign, verify } from 'jsonwebtoken'

// 安全修复: 从环境变量获取JWT密钥，不提供硬编码默认值
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('[SECURITY] JWT_SECRET 环境变量未设置！请设置一个安全的随机密钥。')
}
const JWT_EXPIRES = '24h' // 安全修复: 从30天缩短到24小时

export interface JwtPayload {
  userId: string
  username: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10)
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed)
}

export function signToken(payload: JwtPayload): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured')
  return sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    if (!token || !JWT_SECRET) return null
    const decoded = verify(token, JWT_SECRET) as JwtPayload
    if (!decoded.userId || !decoded.username) return null
    return decoded
  } catch {
    return null
  }
}
