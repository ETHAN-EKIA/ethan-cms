require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./node_modules/.prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const p = new PrismaClient({ adapter });

async function main() {
  const newUsername = 'admin';
  const newPassword = 'admin123';
  const hash = await bcrypt.hash(newPassword, 10);

  // Find existing user (try common usernames)
  let user = await p.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) {
    // Create admin user if none exists
    user = await p.user.create({
      data: { username: newUsername, password: hash, role: 'ADMIN', displayName: 'Admin' }
    });
    console.log('Created new admin user:', user.username);
  } else {
    user = await p.user.update({
      where: { id: user.id },
      data: { username: newUsername, password: hash }
    });
    console.log('Updated user:', user.username);
  }
  console.log('New password: ' + newPassword);

  const verify = await bcrypt.compare(newPassword, hash);
  console.log('Verification:', verify ? 'SUCCESS' : 'FAILED');

  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
