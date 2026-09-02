CREATE POLICY "admins update listings" ON public.property_listings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "property images readable" ON storage.objects;

CREATE POLICY "property images readable" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (
    bucket_id = 'property'
    AND (
      EXISTS (
        SELECT 1 FROM public.property_images pi
        JOIN public.property_listings pl ON pl.id = pi.listing_id
        WHERE pi.image_path = storage.objects.name
          AND pl.status = 'ACTIVE'
          AND pl.expires_at > now()
      )
      OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR public.has_role(auth.uid(), 'admin')
    )
  );