CREATE POLICY "Admins can manage platform payouts"
ON public.platform_payouts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.console_platform_payout(integer, text, text) FROM authenticated;