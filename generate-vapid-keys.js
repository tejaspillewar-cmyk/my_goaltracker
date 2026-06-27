// Run once to generate VAPID keys for Web Push:
//   node generate-vapid-keys.js
//
// Then copy the output into:
//   1. .env.local  (for local dev)
//   2. Vercel → Settings → Environment Variables  (for production)
//   3. supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...

const webPush = require('web-push');
const keys = webPush.generateVAPIDKeys();

console.log('\n✅ VAPID Keys generated — add these to your environment:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('\n📋 For Supabase Edge Function secrets, run:');
console.log(`supabase secrets set VAPID_PUBLIC_KEY="${keys.publicKey}" VAPID_PRIVATE_KEY="${keys.privateKey}"\n`);
