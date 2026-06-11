require('dotenv').config();
const { PrismaClient } = require('./node_modules/.prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const p = new PrismaClient({ adapter, log: ['warn', 'error'] });

async function main() {
  const users = await p.user.findMany({ select: { username: true, email: true, role: true, displayName: true } });
  console.log('=== Database Users ===');
  console.log(JSON.stringify(users, null, 2));
  console.log('Total: ' + users.length + ' users');
  
  const productCount = await p.product.count();
  const categoryCount = await p.category.count();
  const inquiryCount = await p.inquiry.count();
  const blogCount = await p.blog.count();
  console.log('\n=== Data Stats ===');
  console.log('Products: ' + productCount);
  console.log('Categories: ' + categoryCount);
  console.log('Inquiries: ' + inquiryCount);
  console.log('Blogs: ' + blogCount);
  
  await p.$disconnect();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
