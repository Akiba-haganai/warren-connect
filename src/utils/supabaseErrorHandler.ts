export function handleSupabaseError(error: any): never {
  const msg = error?.message || '';

  if (msg.includes('Rate limit exceeded')) {
    throw new Error("You're posting too fast, try again in a minute.");
  }
  
  if (msg.includes('Content violates community guidelines')) {
    throw new Error("Your content violates community guidelines and cannot be posted.");
  }
  
  if (msg.includes('Banned users cannot create') || msg.includes('Banned users cannot update')) {
    throw new Error("Your account has been banned due to policy violations.");
  }
  
  throw error;
}
