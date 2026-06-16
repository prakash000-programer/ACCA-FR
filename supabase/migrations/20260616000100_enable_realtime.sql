-- supabase/migrations/20260616000100_enable_realtime.sql

-- Enable Realtime replication for support_messages and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
