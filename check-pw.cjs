require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./node_modules/.prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const p = new PrismaClient({ adapter });

async function main() {
  const user = await p.user.findUnique({ where: { username: 'ETHAN' } });
  if (!user) { console.log('User not found'); return; }
  
  console.log('=== User Details ===');
  console.log('Username:', user.username);
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('Password hash (first 30 chars):', user.password.substring(0, 30) + '...');
  console.log('Hash length:', user.password.length);
  
  // Test the provided password
  const testPassword = 'Ekialee981@@';
  const match = await bcrypt.compare(testPassword, user.password);
  console.log('\nPassword test "' + testPassword + '":', match ? 'MATCH' : 'NO MATCH');
  
  // Test common passwords
  const tests = ['admin123', 'Admin123', 'Ekialee981', 'Ekialee981@@', 'ETHAN', 'ethan2026'];
  for (const pw of tests) {
    const m = await bcrypt.compare(pw, user.password);
    if (m) console.log('MATCH FOUND: "' + pw + '"');
  }
  
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
