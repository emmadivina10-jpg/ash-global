CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  provider_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  qty integer NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 99),
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own cart select" ON public.cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own cart insert" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own cart update" ON public.cart_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own cart delete" ON public.cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);