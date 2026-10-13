import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() { await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', name: 'Administrator MBG', passwordHash: await bcrypt.hash('admin123', 12), role: 'ADMIN', unit: 'umum' } }); }
main().finally(() => prisma.$disconnect());
