// Seed script — inserts a test admin user into the users table.
// Run from the project root: node seed-test.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jgonilmkqgwsogkwlggk.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnb25pbG1rcWd3c29na3dsZ2drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjEzMjU4MiwiZXhwIjoyMDk3NzA4NTgyfQ.g5P5DnZrEKulLFCtIszpwHpSSJtQEL5XCt5ubsO7YZ8';

// Test user ID — a fixed UUID that stands in for a real Supabase auth user.
// Replace this if you want to link to an actual auth.users row.
const TEST_AUTH_UUID = '00000000-0000-0000-0000-000000000001';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function seed() {
  console.log(`Seeding admin user with auth_id: ${TEST_AUTH_UUID}`);

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        auth_id: TEST_AUTH_UUID,
        display_name: 'Admin',
        role: 'admin',
        is_active: true,
      },
      { onConflict: 'auth_id' }
    )
    .select();

  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }

  console.log('Seed successful:', data);
}

seed();
