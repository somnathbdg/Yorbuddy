-- Migration 022 permission and schema assertions.
-- Run after applying 022 in an isolated test database/staging environment.
DO $$
DECLARE
  suspend_oid REGPROCEDURE := 'public.admin_suspend_buddy_account(uuid,uuid,text)'::regprocedure;
  restore_oid REGPROCEDURE := 'public.admin_restore_buddy_account(uuid,uuid)'::regprocedure;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='admin_buddy_account_actions' AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'RLS must be enabled on admin_buddy_account_actions'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p, LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid=suspend_oid AND a.grantee=0 AND a.privilege_type='EXECUTE'
  ) OR has_function_privilege('anon', suspend_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', suspend_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Untrusted roles must not execute suspend RPC';
  END IF;
  IF NOT has_function_privilege('service_role', suspend_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute suspend RPC';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p, LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid=restore_oid AND a.grantee=0 AND a.privilege_type='EXECUTE'
  ) OR has_function_privilege('anon', restore_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', restore_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Untrusted roles must not execute restore RPC';
  END IF;
  IF NOT has_function_privilege('service_role', restore_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute restore RPC';
  END IF;
  IF has_table_privilege('service_role', 'public.admin_buddy_account_actions', 'UPDATE')
     OR has_table_privilege('service_role', 'public.admin_buddy_account_actions', 'DELETE')
     OR has_table_privilege('service_role', 'public.admin_buddy_account_actions', 'TRUNCATE') THEN
    RAISE EXCEPTION 'service_role must not mutate or truncate audit history directly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='admin_buddy_actions_no_update_delete' AND NOT tgisinternal)
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='admin_buddy_actions_no_truncate' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Append-only audit triggers are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid=suspend_oid AND p.prosecdef
      AND 'search_path=public' = ANY(p.proconfig)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid=restore_oid AND p.prosecdef
      AND 'search_path=public' = ANY(p.proconfig)
  ) THEN
    RAISE EXCEPTION 'RPCs must be SECURITY DEFINER with fixed search_path';
  END IF;
END $$;
