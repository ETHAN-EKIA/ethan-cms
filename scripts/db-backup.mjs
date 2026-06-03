#!/usr/bin/env node
/**
 * ETHAN CMS 数据库自动备份脚本
 * 
 * 功能:
 *   - 从 Railway MySQL 导出全量备份
 *   - 压缩存储为 .sql.gz 文件
 *   - 自动保留最近 N 天的备份，清理旧文件
 *   - 支持定时运行（通过 cron 或 Railway 定时任务）
 * 
 * 使用方法:
 *   node scripts/db-backup.mjs
 * 
 * 环境变量:
 *   DATABASE_URL - MySQL 连接字符串（从 .env 读取）
 *   BACKUP_DIR   - 备份文件存储目录（默认 ./backups）
 *   BACKUP_KEEP  - 保留备份数量（默认 14）
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdir, readdir, unlink, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))

// 加载 .env
config({ path: join(__dirname, '..', '.env') })

const DATABASE_URL = process.env.DATABASE_URL
const BACKUP_DIR = process.env.BACKUP_DIR || join(__dirname, '..', 'backups')
const BACKUP_KEEP = parseInt(process.env.BACKUP_KEEP || '14')

if (!DATABASE_URL) {
  console.error('错误: DATABASE_URL 未设置')
  process.exit(1)
}

// 解析数据库连接信息
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)
  if (!match) throw new Error('无法解析 DATABASE_URL')
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  }
}

async function createBackup() {
  const db = parseDbUrl(DATABASE_URL)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup-${timestamp}.sql`
  const filepath = join(BACKUP_DIR, filename)

  // 确保备份目录存在
  await mkdir(BACKUP_DIR, { recursive: true })

  console.log(`[${new Date().toISOString()}] 开始备份数据库...`)
  console.log(`  主机: ${db.host}:${db.port}`)
  console.log(`  数据库: ${db.database}`)
  console.log(`  输出: ${filepath}`)

  try {
    // 使用 mysqldump 导出
    const cmd = [
      'mysqldump',
      `-h ${db.host}`,
      `-P ${db.port}`,
      `-u ${db.user}`,
      `-p"${db.password}"`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--set-gtid-purged=OFF',
      '--skip-ssl',
      db.database,
      `> "${filepath}"`,
    ].join(' ')

    await execAsync(cmd, { timeout: 300_000 }) // 5分钟超时

    // 检查文件大小
    const fileStat = await stat(filepath)
    const sizeMB = (fileStat.size / 1024 / 1024).toFixed(2)
    console.log(`  备份完成: ${sizeMB} MB`)

    // 尝试压缩
    try {
      await execAsync(`gzip "${filepath}"`, { timeout: 60_000 })
      console.log(`  压缩完成: ${filepath}.gz`)
    } catch {
      console.log('  压缩跳过（gzip 不可用），保留原始 SQL 文件')
    }

    return filepath
  } catch (error) {
    console.error('  备份失败:', error.message)
    // 清理失败的文件
    try { await unlink(filepath) } catch { /* ignore */ }
    throw error
  }
}

async function cleanupOldBackups() {
  console.log(`\n清理旧备份（保留最近 ${BACKUP_KEEP} 个）...`)

  try {
    const files = await readdir(BACKUP_DIR)
    const backups = files
      .filter(f => f.startsWith('backup-') && (f.endsWith('.sql') || f.endsWith('.sql.gz')))
      .sort()
      .reverse()

    const toDelete = backups.slice(BACKUP_KEEP)
    for (const file of toDelete) {
      const filepath = join(BACKUP_DIR, file)
      await unlink(filepath)
      console.log(`  已删除: ${file}`)
    }

    console.log(`  当前保留 ${backups.length - toDelete.length} 个备份`)
  } catch (error) {
    console.error('  清理失败:', error.message)
  }
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  ETHAN CMS 数据库备份工具')
  console.log('═══════════════════════════════════════')

  try {
    await createBackup()
    await cleanupOldBackups()
    console.log('\n备份任务完成！')
  } catch (error) {
    console.error('\n备份任务失败:', error.message)
    process.exit(1)
  }
}

main()
