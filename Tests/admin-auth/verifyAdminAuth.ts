/**
 * Manual verification script for Admin Authentication System
 * This script helps verify that the admin system is working correctly
 */

import { isAdmin, requireAdmin, getAdminEmails, isAdminConfigured } from '@/lib/adminAuth';

// Test data
const testEmails = [
  'admin@example.com',    // Should be admin if configured
  'test@example.com',     // Should be admin if configured  
  'user@example.com',     // Should NOT be admin
  null,                   // Should NOT be admin
  undefined,              // Should NOT be admin
  ''                      // Should NOT be admin
];

console.log('🔧 Admin Authentication System Verification');
console.log('==============================================');

// Check if admin is configured
console.log('\n1. Configuration Status:');
console.log(`   Admin configured: ${isAdminConfigured()}`);
console.log(`   Admin emails: ${JSON.stringify(getAdminEmails())}`);

// Test each email
console.log('\n2. Email Testing:');
testEmails.forEach(email => {
  const result = isAdmin(email);
  console.log(`   ${email || 'null/undefined'}: ${result ? '✅ ADMIN' : '❌ NOT ADMIN'}`);
});

// Test requireAdmin function
console.log('\n3. Access Control Testing:');
testEmails.forEach(email => {
  try {
    requireAdmin(email);
    console.log(`   ${email || 'null/undefined'}: ✅ ACCESS GRANTED`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`   ${email || 'null/undefined'}: ❌ ACCESS DENIED - ${errorMessage}`);
  }
});

console.log('\n✅ Admin Authentication System verification complete!');
console.log('\nTo use this system:');
console.log('1. Set ADMIN_EMAILS in .env.local (comma-separated)');
console.log('2. Import { isAdmin, requireAdmin } from "@/lib/adminAuth"');
console.log('3. Use isAdmin(email) to check access');
console.log('4. Use requireAdmin(email) to enforce access');
console.log('5. Wrap admin routes with <AdminRouteGuard>');
