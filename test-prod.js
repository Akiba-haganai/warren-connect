import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
  console.log("Running Prod Verification Tests...");
  
  // 1. Sign up test users
  const aEmail = `test_a_${Date.now()}@example.com`;
  const bEmail = `test_b_${Date.now()}@example.com`;
  const password = "TestPassword123!";

  console.log("Signing up User A...");
  const { data: userA, error: errA } = await supabase.auth.signUp({ email: aEmail, password });
  if (errA) throw errA;

  console.log("Signing up User B...");
  const { data: userB, error: errB } = await supabase.auth.signUp({ email: bEmail, password });
  if (errB) throw errB;

  const aId = userA.user.id;
  const bId = userB.user.id;
  console.log(`User A: ${aId}`);
  console.log(`User B: ${bId}`);

  // Need to wait briefly for triggers to create profiles
  await new Promise(r => setTimeout(r, 2000));

  // --- TEST 5: Rate Limiting ---
  console.log("\n--- TEST 5: Rate Limiting ---");
  // Login as User A
  await supabase.auth.signInWithPassword({ email: aEmail, password });
  let successCount = 0;
  let rateLimitHit = false;
  let rawError = null;
  
  for (let i = 0; i < 7; i++) {
    const { error } = await supabase.from('posts').insert({
      user_id: aId,
      content: `Rate limit test post ${i}`
    });
    if (error) {
      rateLimitHit = true;
      rawError = error;
      console.log(`Post ${i} failed as expected: ${error.message}`);
      break;
    }
    successCount++;
    console.log(`Post ${i} succeeded`);
  }
  console.log(`Result: ${successCount} successful posts. Rate limit hit: ${rateLimitHit}`);
  console.log(`Raw Postgres Error Format:`, rawError);

  // --- TEST 1: Blocking ---
  console.log("\n--- TEST 1: Blocking ---");
  // B creates a post
  await supabase.auth.signInWithPassword({ email: bEmail, password });
  await supabase.from('posts').insert({ user_id: bId, content: "Post from B" });
  
  // A checks feed
  await supabase.auth.signInWithPassword({ email: aEmail, password });
  const { data: feedBefore } = await supabase.from('posts').select('*').eq('user_id', bId);
  console.log(`A can see B's posts before block: ${feedBefore?.length > 0}`);

  // A blocks B
  const { error: blockErr } = await supabase.from('blocked_users').insert({ blocker_id: aId, blocked_id: bId });
  if (blockErr) console.error("Block Error:", blockErr);

  // A checks feed again
  const { data: feedAfter } = await supabase.from('posts').select('*').eq('user_id', bId);
  console.log(`A can see B's posts after block: ${feedAfter?.length > 0}`);

  // B checks if they can see A's posts
  await supabase.auth.signInWithPassword({ email: bEmail, password });
  const { data: bFeedAfter } = await supabase.from('posts').select('*').eq('user_id', aId);
  console.log(`B can see A's posts after block (bidirectional): ${bFeedAfter?.length > 0}`);

  // --- TEST 3 & 4: Keyword Filtering ---
  console.log("\n--- TEST 3 & 4: Keyword Filtering ---");
  // Try inserting a keyword if we can (table has no RLS, so it might work, or might fail if anon doesn't have INSERT grant)
  const { error: kwErr } = await supabase.from('blocked_keywords').insert([
    { keyword: 'badword', severity: 'block' },
    { keyword: 'flagword', severity: 'flag' }
  ]);
  if (kwErr) {
    console.log("Could not insert keyword from client (expected if table has no INSERT grant for anon). Need admin to test this.");
    console.log("Error:", kwErr.message);
  } else {
    console.log("Keywords inserted.");
    
    // Test Block
    const { error: postBlockErr } = await supabase.from('posts').insert({ user_id: bId, content: "This is a badword!" });
    console.log(`Post with 'badword' failed: ${postBlockErr ? postBlockErr.message : 'No, it succeeded (FAIL)'}`);

    // Test Flag
    const { error: postFlagErr, data: postFlagData } = await supabase.from('posts').insert({ user_id: bId, content: "This is a flagword!" }).select('id').single();
    console.log(`Post with 'flagword' succeeded: ${!postFlagErr}`);
    
    // Check if report was generated
    const { data: reports } = await supabase.from('reports').select('*').eq('content_id', postFlagData?.id);
    console.log(`Auto-flag report generated: ${reports?.length > 0}`);
    if (reports?.length > 0) {
      console.log(`is_system_generated: ${reports[0].is_system_generated}`);
    }
  }
}

runTests().catch(console.error);
