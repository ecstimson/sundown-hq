-- Migration: Enable Supabase Realtime for chat_messages
-- The GroupChat UI subscribes to INSERT events via postgres_changes,
-- which requires the table to be part of the supabase_realtime publication.

alter publication supabase_realtime add table chat_messages;
