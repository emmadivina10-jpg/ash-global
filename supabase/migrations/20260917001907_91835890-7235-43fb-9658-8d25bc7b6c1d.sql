CREATE OR REPLACE FUNCTION public.is_project_client(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.freelance_projects p WHERE p.id = _project_id AND p.client_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.is_project_client(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_project_client(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_project_proposal(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.freelance_proposals p WHERE p.project_id = _project_id AND p.freelancer_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.has_project_proposal(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_project_proposal(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS projects_read ON public.freelance_projects;
CREATE POLICY projects_read ON public.freelance_projects FOR SELECT TO authenticated
USING (status = 'OPEN' OR client_id = auth.uid() OR awarded_user_id = auth.uid() OR public.has_project_proposal(id, auth.uid()));

DROP POLICY IF EXISTS proposals_read_participants ON public.freelance_proposals;
CREATE POLICY proposals_read_participants ON public.freelance_proposals FOR SELECT TO authenticated
USING (freelancer_id = auth.uid() OR public.is_project_client(project_id, auth.uid()));

DROP POLICY IF EXISTS proposals_update_participants ON public.freelance_proposals;
CREATE POLICY proposals_update_participants ON public.freelance_proposals FOR UPDATE TO authenticated
USING (freelancer_id = auth.uid() OR public.is_project_client(project_id, auth.uid()))
WITH CHECK (freelancer_id = auth.uid() OR public.is_project_client(project_id, auth.uid()));