// Checks whether the test admin user exists in the database.
// Run from the project root: node check-seed.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jgonilmkqgwsogkwlggk.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnb25pbG1rcWd3c29na3dsZ2drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjEzMjU4MiwiZXhwIjoyMDk3NzA4NTgyfQ.g5P5DnZrEKulLFCtIszpwHpSSJtQEL5XCt5ubsO7YZ8';

const TEST_AUTH_UUID = '00000000-0000-0000-0000-000000000001';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', TEST_AUTH_UUID);

if (error) {
  console.error('Check failed:', error.message);
} else if (data.length === 0) {
  console.log('❌ Test user not found — seed script has not been run yet.');
} else {
  console.log('✅ Test user found:', data[0]);
}
