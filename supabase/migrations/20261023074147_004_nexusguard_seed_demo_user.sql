/*
# NexusGuard Phase 2 — Seed Demo Auth User

Creates a demo authenticated user and links them to the demo organization
as an admin. Email: demo@nexusguard.local, password: Demo1234!
*/

DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@nexusguard.local';
  
  IF demo_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'demo@nexusguard.local',
      crypt('Demo1234!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '{}'::jsonb,
      '{}'::jsonb
    )
    RETURNING id INTO demo_user_id;
  END IF;
  
  INSERT INTO org_members (user_id, organization_id, role)
  VALUES (demo_user_id, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    demo_user_id::text,
    demo_user_id,
    jsonb_build_object('sub', demo_user_id::text, 'email', 'demo@nexusguard.local'),
    'email',
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = demo_user_id
  );
END $$;