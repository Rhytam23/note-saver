-- The live database still had the original bump_version_and_timestamp() without a fixed
-- search_path (Supabase security advisor: function_search_path_mutable), even though
-- 20260901_offline_sync_support.sql defines it with one. This pins it on databases that
-- were set up before that migration; on fresh databases it is a no-op.

ALTER FUNCTION public.bump_version_and_timestamp() SET search_path = public, pg_catalog;
