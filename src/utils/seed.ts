import { PrismaClient, UserRole, AuthProvider } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export async function seedSuperAdmin() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'fredokcee1@gmail.com';

  const existing = await prisma.user.findUnique({
    where: { email: superAdminEmail }
  });

  if (existing) {
    if (existing.role !== UserRole.SUPER_ADMIN) {
      await prisma.user.update({
        where: { email: superAdminEmail },
        data: { role: UserRole.SUPER_ADMIN }
      });
      console.log('👑 Super admin role updated');
    }
    return;
  }

  const hashedPassword = await argon2.hash('SuperAdmin2026!ChangeMe');

  await prisma.user.create({
    data: {
      email: superAdminEmail,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      authProvider: AuthProvider.LOCAL,
      password: hashedPassword,
      isActive: true,
    }
  });

  console.log('👑 Super admin created:', superAdminEmail);
  console.log('⚠️  IMPORTANT: Change the default password immediately after first login!');
}

// Run if called directly
if (require.main === module) {
  seedSuperAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
