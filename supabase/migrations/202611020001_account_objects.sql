CREATE TABLE IF NOT EXISTS public.account_objects (
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 object_key text NOT NULL,
 payload text NOT NULL,
 etag uuid NOT NULL DEFAULT gen_random_uuid(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (owner_id, object_key)
);
ALTER TABLE public.account_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_objects_owner ON public.account_objects
 FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_objects TO authenticated;
REVOKE ALL ON public.account_objects FROM anon;
CREATE OR REPLACE FUNCTION public.write_account_object(p_key text,p_payload text,p_expected uuid DEFAULT NULL,p_create_only boolean DEFAULT false)
RETURNS TABLE(etag uuid) LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 IF p_expected IS NOT NULL THEN
  RETURN QUERY UPDATE public.account_objects AS a SET payload=p_payload,etag=gen_random_uuid(),updated_at=now()
   WHERE a.owner_id=caller AND a.object_key=p_key AND a.etag=p_expected RETURNING a.etag;
 ELSIF p_create_only THEN
  RETURN QUERY INSERT INTO public.account_objects(owner_id,object_key,payload) VALUES(caller,p_key,p_payload)
   ON CONFLICT DO NOTHING RETURNING account_objects.etag;
 ELSE
  RETURN QUERY INSERT INTO public.account_objects(owner_id,object_key,payload) VALUES(caller,p_key,p_payload)
   ON CONFLICT(owner_id,object_key) DO UPDATE SET payload=EXCLUDED.payload,etag=gen_random_uuid(),updated_at=now()
   RETURNING account_objects.etag;
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.write_account_object(text,text,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.write_account_object(text,text,uuid,boolean) TO authenticated;
