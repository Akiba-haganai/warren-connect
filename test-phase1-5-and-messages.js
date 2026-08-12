import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  console.log("=== Testing Phase 1.5 & Message RLS ===\n");

  // 1. Authenticate two test users (create them or use existing ones)
  const user1Email = `test1_${Date.now()}@example.com`;
  const user2Email = `test2_${Date.now()}@example.com`;
  const client1 = createClient(supabaseUrl, supabaseAnonKey);
  const client2 = createClient(supabaseUrl, supabaseAnonKey);

  const { data: d1, error: err1 } = await client1.auth.signUp({ email: user1Email, password: 'password123' });
  const { data: d2, error: err2 } = await client2.auth.signUp({ email: user2Email, password: 'password123' });
  const user1 = d1.user;
  const user2 = d2.user;

  if (err1 || err2 || !user1 || !user2 || !d1.session || !d2.session) {
    console.error("Failed to authenticate test users or email confirmation is required.");
    console.log("Session 1:", !!d1.session, "Session 2:", !!d2.session);
    process.exit(1);
  }
  
  console.log(`User 1: ${user1.id}`);
  console.log(`User 2: ${user2.id}`);

  // Test 1: Keyword Blocking (Severity: block)
  console.log("\n--- Test 1: Keyword Blocking (Severity: block) ---");
  const blockKeyword = "kill"; // Assumes "kill" is set to severity 'block' in DB
  const { data: postData, error: postError } = await client1
    .from('posts')
    .insert({ user_id: user1.id, content: `I want to ${blockKeyword} someone` })
    .select();

  if (postError) {
    if (postError.message.includes("Content violates community guidelines")) {
      console.log("✅ Passed: Post was correctly blocked by keyword filter with 'Content violates community guidelines'.");
    } else {
      console.log("❌ Failed: Post was blocked, but with an unexpected error:", postError.message);
    }
  } else {
    console.log("❌ Failed: Post with 'block' keyword was allowed successfully! Trigger might not be working.");
  }

  // Test 2: Message Block RLS
  console.log("\n--- Test 2: Messages Block RLS ---");
  // User 1 blocks User 2
  const { error: blockError } = await client1
    .from('blocked_users')
    .upsert({ blocker_id: user1.id, blocked_id: user2.id });
  
  if (blockError) {
    console.log("Error setting up block:", blockError);
  } else {
    console.log("User 1 blocked User 2 successfully.");
  }

  // User 2 tries to send a message to User 1
  // Try to create a conversation first (User 2 -> User 1)
  const { data: convData, error: convError } = await client2
    .from('conversations')
    .insert({ user1_id: user2.id, user2_id: user1.id })
    .select()
    .maybeSingle();

  let conversationId = convData?.id;

  if (convError && convError.code !== '23505') {
      console.log("Error creating conversation:", convError.message);
  }
  
  if (!conversationId) {
      // maybe it exists, let's fetch it
      const { data: existingConv } = await client2
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user2.id},user2_id.eq.${user1.id}),and(user1_id.eq.${user1.id},user2_id.eq.${user2.id})`)
        .maybeSingle();
      conversationId = existingConv?.id;
  }

  if (conversationId) {
      console.log(`Using conversation ID: ${conversationId}`);
      const { error: msgError } = await client2
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user2.id,
            content: "Hello, can you see this?"
        });

      if (msgError) {
          if (msgError.message.includes('row-level security policy') || msgError.code === '42501') {
              console.log("✅ Passed: Message insertion correctly blocked by RLS for blocked users.");
          } else {
              console.log("❌ Failed: Message blocked but with unexpected error:", msgError.message);
          }
      } else {
          console.log("❌ Failed: User 2 was able to send a message to User 1 despite being blocked!");
      }
  } else {
      console.log("❌ Failed: Could not get or create a conversation to test message insertion.");
      if (convError?.message?.includes('row-level security policy')) {
         console.log("✅ Wait! The *conversation* creation itself was blocked by RLS. This is also a correct behavior if they are blocked.");
      }
  }

  // Clean up block
  await client1.from('blocked_users').delete().eq('blocker_id', user1.id).eq('blocked_id', user2.id);
  console.log("\nCleanup: Removed block.");

  process.exit(0);
}

runTest().catch(console.error);
