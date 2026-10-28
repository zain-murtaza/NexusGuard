/*
# Fix infinite recursion in org_members RLS policies

## Root cause
The `members_select_own`, `members_insert_admin`, and `members_delete_admin`
policies on `org_members` each contain a subquery that reads `org_members`
itself. Because RLS applies to that subquery too, the policy re-evaluates
itself, producing infinite recursion:
  "infinite recursion detected in policy for relation org_members"
This caused every authenticated query against `org_members` to fail silently
(returning null), which broke organization resolution in the GitHub inspection
route, the AI-review route, and the dashboard data loader.

## Fix
1. SELECT policy: replace the self-referencing EXISTS subquery with a direct
   row-level check `user_id = auth.uid()`. A user can always see their own
   membership rows — no subquery needed.
2. INSERT policy: use a SECURITY DEFINER function `is_org_admin` that reads
   `org_members` with the owner role (bypassing RLS), breaking the recursion.
   The policy checks that the inserting user is an admin of the target org.
3. DELETE policy: same `is_org_admin` function for the admin check.

## Security
- RLS remains enabled on `org_members`.
- Grants unchanged: SELECT, INSERT, DELETE to `authenticated`.
- The `is_org_admin` function is SECURITY DEFINER owned by the postgres role,
  reads `org_members` with owner privileges, and is revoked from PUBLIC/anon
  so only `authenticated` can call it.
- Organization-scoped isolation is preserved: users can only read their own
  memberships; only admins can insert or delete memberships.
*/

-- Helper function: is the current user an admin of the given organization?
-- SECURITY DEFINER breaks the RLS recursion by reading org_members as the owner.
CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid()
      AND organization_id = target_org_id
      AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

-- Replace the recursive SELECT policy with a direct row-level check.
DROP POLICY IF EXISTS "members_select_own" ON org_members;
CREATE POLICY "members_select_own" ON org_members FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- Replace the recursive INSERT policy with the admin helper function.
DROP POLICY IF EXISTS "members_insert_admin" ON org_members;
CREATE POLICY "members_insert_admin" ON org_members FOR INSERT
  TO authenticated WITH CHECK (
    public.is_org_admin(organization_id)
  );

-- Replace the recursive DELETE policy with the admin helper function.
DROP POLICY IF EXISTS "members_delete_admin" ON org_members;
CREATE POLICY "members_delete_admin" ON org_members FOR DELETE
  TO authenticated USING (
    public.is_org_admin(organization_id)
  );
