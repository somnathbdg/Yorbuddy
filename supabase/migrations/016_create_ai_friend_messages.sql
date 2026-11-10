-- AI Friend persistent conversation history.
-- Backend accesses this table with the Supabase service role after JWT authentication.
CREATE TABLE IF NOT EXISTS public.ai_friend_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  personality VARCHAR(20) NOT NULL CHECK (personality IN ('friend','listener','motivator','funny','mentor')),
  role VARCHAR(10) NOT NULL CHECK (role IN ('user','model')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_friend_messages_user_personality_created
  ON public.ai_friend_messages(user_id, personality, created_at, id);
ALTER TABLE public.ai_friend_messages ENABLE ROW LEVEL SECURITY;
-- No browser policies: only the trusted backend service role may read/write.
COMMENT ON TABLE public.ai_friend_messages IS
  'Private per-user, per-personality AI Friend conversation history.';
