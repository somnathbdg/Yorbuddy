-- Admin Buddy account suspension / restoration with immutable action history.
CREATE TABLE IF NOT EXISTS public.admin_buddy_account_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id UUID NOT NULL REFERENCES public.users(id),
  buddy_user_id UUID NOT NULL REFERENCES public.users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('suspend', 'restore')),
  reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_buddy_actions_buddy_created
  ON public.admin_buddy_account_actions(buddy_user_id, created_at DESC);
ALTER TABLE public.admin_buddy_account_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_buddy_account_actions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admin_buddy_account_actions FROM service_role;

-- Preserve action history: application roles cannot update, delete, or truncate it.
CREATE OR REPLACE FUNCTION public.prevent_admin_buddy_action_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $
BEGIN
  RAISE EXCEPTION 'Admin Buddy action history is append-only';
END;
$;
CREATE TRIGGER admin_buddy_actions_no_update_delete
  BEFORE UPDATE OR DELETE ON public.admin_buddy_account_actions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_buddy_action_mutation();
CREATE TRIGGER admin_buddy_actions_no_truncate
  BEFORE TRUNCATE ON public.admin_buddy_account_actions
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_admin_buddy_action_mutation();

CREATE OR REPLACE FUNCTION public.admin_suspend_buddy_account(
  p_actor_id UUID, p_buddy_user_id UUID, p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_role TEXT; actor_role TEXT;
BEGIN
  SELECT role INTO actor_role FROM public.users WHERE id=p_actor_id AND is_active=TRUE;
  IF actor_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_actor_id=p_buddy_user_id THEN RAISE EXCEPTION 'You cannot suspend your own account'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 10 OR length(trim(p_reason)) > 500 THEN RAISE EXCEPTION 'Suspension reason must be 10-500 characters'; END IF;
  SELECT role INTO target_role FROM public.users WHERE id=p_buddy_user_id AND is_active=TRUE FOR UPDATE;
  IF target_role IS DISTINCT FROM 'buddy' THEN RAISE EXCEPTION 'Active Buddy account not found'; END IF;
  UPDATE public.users SET is_active=FALSE, updated_at=NOW() WHERE id=p_buddy_user_id;
  UPDATE public.buddy_profiles SET is_verified=FALSE, is_online=FALSE WHERE user_id=p_buddy_user_id;
  UPDATE public.refresh_tokens SET revoked_at=COALESCE(revoked_at,NOW()) WHERE user_id=p_buddy_user_id AND revoked_at IS NULL;
  INSERT INTO public.admin_buddy_account_actions(actor_admin_id,buddy_user_id,action,reason)
    VALUES(p_actor_id,p_buddy_user_id,'suspend',trim(p_reason));
  RETURN jsonb_build_object('buddy_user_id',p_buddy_user_id,'is_active',false,'action','suspend');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_restore_buddy_account(
  p_actor_id UUID, p_buddy_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role TEXT; target_role TEXT; kyc_status TEXT;
BEGIN
  SELECT role INTO actor_role FROM users WHERE id=p_actor_id AND is_active=TRUE;
  IF actor_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_actor_id=p_buddy_user_id THEN RAISE EXCEPTION 'You cannot restore your own account'; END IF;
  SELECT role INTO target_role FROM public.users WHERE id=p_buddy_user_id AND is_active=FALSE FOR UPDATE;
  IF target_role IS DISTINCT FROM 'buddy' THEN RAISE EXCEPTION 'Suspended Buddy account not found'; END IF;
  SELECT verification_status INTO kyc_status FROM public.buddy_profiles WHERE user_id=p_buddy_user_id;
  UPDATE public.users SET is_active=TRUE, updated_at=NOW() WHERE id=p_buddy_user_id;
  UPDATE public.buddy_profiles
    SET is_verified=(kyc_status='approved'), is_online=FALSE
    WHERE user_id=p_buddy_user_id;
  INSERT INTO admin_buddy_account_actions(actor_admin_id,buddy_user_id,action,reason)
    VALUES(p_actor_id,p_buddy_user_id,'restore','Restored by authorized admin');
  RETURN jsonb_build_object('buddy_user_id',p_buddy_user_id,'is_active',true,'is_verified',(kyc_status='approved'),'is_online',false,'action','restore');
END; $$;

REVOKE ALL ON FUNCTION public.admin_suspend_buddy_account(UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_restore_buddy_account(UUID,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_buddy_account(UUID,UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_buddy_account(UUID,UUID) TO service_role;
