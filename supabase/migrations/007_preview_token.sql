-- Run this in Supabase Dashboard → SQL Editor

-- Add preview_token to profiles (auto-generated per user)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preview_token uuid DEFAULT gen_random_uuid();

-- Backfill any existing rows that somehow have NULL
UPDATE public.profiles
  SET preview_token = gen_random_uuid()
  WHERE preview_token IS NULL;

-- SECURITY DEFINER function: returns preview data for a given token.
-- Runs with postgres-level permissions so it can bypass RLS.
-- Only returns data when the token matches a real profile.
CREATE OR REPLACE FUNCTION public.get_preview_data(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result  jsonb;
  v_rank_week date;
  v_ai_week   date;
BEGIN
  SELECT id INTO v_user_id FROM profiles WHERE preview_token = p_token;
  IF v_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT scan_week INTO v_rank_week
    FROM rank_snapshots WHERE user_id = v_user_id
    ORDER BY scan_week DESC LIMIT 1;

  SELECT scan_week INTO v_ai_week
    FROM ai_visibility_results WHERE user_id = v_user_id
    ORDER BY scan_week DESC LIMIT 1;

  SELECT jsonb_build_object(
    'business_name', p.business_name,
    'business_type', p.business_type,
    'city_state',    p.city_state,
    'keywords',      p.keywords,
    'rank_snapshots', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'keyword',   rs.keyword,
        'rank',      rs.rank,
        'scan_week', rs.scan_week
      ))
      FROM rank_snapshots rs
      WHERE rs.user_id = v_user_id AND rs.scan_week = v_rank_week
    ), '[]'::jsonb),
    'ai_visibility', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'engine',    av.engine,
        'query',     av.query,
        'mentioned', av.mentioned,
        'excerpt',   av.excerpt,
        'scan_week', av.scan_week
      ) ORDER BY av.engine, av.query)
      FROM ai_visibility_results av
      WHERE av.user_id = v_user_id AND av.scan_week = v_ai_week
    ), '[]'::jsonb)
  ) INTO v_result
  FROM profiles p
  WHERE p.id = v_user_id;

  RETURN v_result;
END;
$$;
