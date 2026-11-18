-- Real PostgreSQL integration tests for migration 022. Run with ON_ERROR_STOP=1.
BEGIN;
INSERT INTO public.users(id,email,role,is_active) VALUES
 ('00000000-0000-4000-8000-000000000001','admin@example.test','admin',true),
 ('00000000-0000-4000-8000-000000000002','buddy@example.test','buddy',true),
 ('00000000-0000-4000-8000-000000000003','member@example.test','member',true),
 ('00000000-0000-4000-8000-000000000004','inactive-admin@example.test','admin',false);
INSERT INTO public.buddy_profiles(user_id,verification_status,is_verified,is_online)
VALUES ('00000000-0000-4000-8000-000000000002','approved',true,true);
INSERT INTO public.refresh_tokens(user_id) VALUES ('00000000-0000-4000-8000-000000000002');

DO $$
DECLARE result jsonb; token_count integer; audit_count integer;
BEGIN
  result := public.admin_suspend_buddy_account(
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    'Policy violation confirmed'
  );
  IF result->>'action' <> 'suspend' OR result->>'is_active' <> 'false' THEN
    RAISE EXCEPTION 'Suspend RPC returned unexpected payload: %', result;
  END IF;
  IF (SELECT is_active FROM public.users WHERE id='00000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'Suspend did not deactivate user';
  END IF;
  IF (SELECT is_verified OR is_online FROM public.buddy_profiles WHERE user_id='00000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'Suspend did not disable buddy visibility';
  END IF;
  SELECT count(*) INTO token_count FROM public.refresh_tokens
    WHERE user_id='00000000-0000-4000-8000-000000000002' AND revoked_at IS NOT NULL;
  IF token_count <> 1 THEN RAISE EXCEPTION 'Suspend did not revoke refresh token'; END IF;
  SELECT count(*) INTO audit_count FROM public.admin_buddy_account_actions
    WHERE action='suspend' AND buddy_user_id='00000000-0000-4000-8000-000000000002';
  IF audit_count <> 1 THEN RAISE EXCEPTION 'Suspend audit event missing'; END IF;

  result := public.admin_restore_buddy_account(
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002'
  );
  IF result->>'action' <> 'restore' OR result->>'is_active' <> 'true' OR result->>'is_verified' <> 'true' THEN
    RAISE EXCEPTION 'Restore RPC returned unexpected payload: %', result;
  END IF;
  IF (SELECT is_online FROM public.buddy_profiles WHERE user_id='00000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'Restore must leave Buddy offline';
  END IF;
  SELECT count(*) INTO audit_count FROM public.admin_buddy_account_actions
    WHERE buddy_user_id='00000000-0000-4000-8000-000000000002';
  IF audit_count <> 2 THEN RAISE EXCEPTION 'Expected suspend and restore audit events'; END IF;

  BEGIN
    PERFORM public.admin_suspend_buddy_account(
      '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000002',
      'Unauthorized action'
    );
    RAISE EXCEPTION 'Non-admin suspend unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Non-admin suspend unexpectedly succeeded' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.admin_suspend_buddy_account(
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Self suspension forbidden'
    );
    RAISE EXCEPTION 'Self-suspend unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Self-suspend unexpectedly succeeded' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.admin_suspend_buddy_account(
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      'short'
    );
    RAISE EXCEPTION 'Short reason unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Short reason unexpectedly succeeded' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.admin_suspend_buddy_account(
      '00000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000002',
      'Inactive admin cannot act'
    );
    RAISE EXCEPTION 'Inactive admin unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Inactive admin unexpectedly succeeded' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;
