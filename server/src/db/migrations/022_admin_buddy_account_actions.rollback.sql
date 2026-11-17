-- Rollback for migration 022_admin_buddy_account_actions.sql
-- WARNING: This permanently deletes the suspension/restore audit history.
-- Export admin_buddy_account_actions before running if records must be retained.
BEGIN;
DROP TRIGGER IF EXISTS admin_buddy_actions_no_update_delete ON public.admin_buddy_account_actions;
DROP TRIGGER IF EXISTS admin_buddy_actions_no_truncate ON public.admin_buddy_account_actions;
DROP FUNCTION IF EXISTS public.prevent_admin_buddy_action_mutation();
DROP FUNCTION IF EXISTS public.admin_suspend_buddy_account(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_restore_buddy_account(UUID, UUID);
DROP TABLE IF EXISTS public.admin_buddy_account_actions;
COMMIT;
