REVOKE ALL ON FUNCTION public.get_user_network_tree_with_profiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_network_tree_with_profiles() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_network_tree_with_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_network_tree_with_profiles() TO service_role;