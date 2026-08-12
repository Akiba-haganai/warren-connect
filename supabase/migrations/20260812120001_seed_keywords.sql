insert into public.blocked_keywords (keyword, severity) values
  ('kill', 'block'),
  ('murder', 'block'),
  ('assassinate', 'block'),
  ('bomb', 'block'),
  ('terrorist', 'block'),
  ('idiot', 'flag'),
  ('stupid', 'flag'),
  ('moron', 'flag'),
  ('scam', 'flag')
on conflict (keyword) do nothing;
