-- Run this in the Supabase SQL editor before deploying the /audit page.

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  resume_text text,
  role_type text,
  company text,
  overall_score integer,
  full_results jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
