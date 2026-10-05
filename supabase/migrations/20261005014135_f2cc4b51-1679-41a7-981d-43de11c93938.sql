CREATE TYPE public.inventory_role AS ENUM ('OWNER','MANAGER','INVENTORY_MANAGER','WAREHOUSE','VIEWER');
CREATE TYPE public.inventory_movement_type AS ENUM ('OPENING','PURCHASE','SALE','RETURN','DAMAGE','EXPIRED','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','COUNT');

CREATE TABLE public.inventory_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.inventory_role NOT NULL DEFAULT 'VIEWER',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id),
  CHECK (role <> 'OWNER')
);
CREATE TABLE public.inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'MAIN' CHECK (kind IN ('MAIN','BRANCH','WAREHOUSE','OTHER')),
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE TABLE public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name),
  UNIQUE (business_id, id)
);
CREATE TABLE public.inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  category_id uuid,
  default_location_id uuid,
  name text NOT NULL,
  sku text,
  unit text NOT NULL DEFAULT 'unit',
  buying_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (buying_price >= 0),
  selling_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  min_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, category_id) REFERENCES public.inventory_categories(business_id, id),
  FOREIGN KEY (business_id, default_location_id) REFERENCES public.inventory_locations(business_id, id)
);
CREATE UNIQUE INDEX inventory_products_sku_uq ON public.inventory_products(business_id, lower(sku)) WHERE sku IS NOT NULL AND sku <> '';
CREATE TABLE public.inventory_stock (
  business_id uuid NOT NULL,
  product_id uuid NOT NULL,
  location_id uuid NOT NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, location_id),
  FOREIGN KEY (business_id, product_id) REFERENCES public.inventory_products(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, location_id) REFERENCES public.inventory_locations(business_id, id) ON DELETE CASCADE
);
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  product_id uuid NOT NULL,
  location_id uuid NOT NULL,
  movement_type public.inventory_movement_type NOT NULL,
  quantity numeric(14,3) NOT NULL,
  previous_quantity numeric(14,3) NOT NULL,
  new_quantity numeric(14,3) NOT NULL,
  unit_cost numeric(14,2),
  reference text,
  reason text,
  transfer_group uuid,
  source text NOT NULL DEFAULT 'DASHBOARD',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, product_id) REFERENCES public.inventory_products(business_id, id),
  FOREIGN KEY (business_id, location_id) REFERENCES public.inventory_locations(business_id, id)
);
CREATE INDEX inventory_movements_biz_idx ON public.inventory_movements(business_id, created_at DESC);
CREATE INDEX inventory_movements_product_idx ON public.inventory_movements(product_id, created_at DESC);
CREATE TABLE public.inventory_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_audit_biz_idx ON public.inventory_audit_log(business_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inventory_locations, public.inventory_categories, public.inventory_products TO authenticated;
GRANT SELECT ON public.inventory_stock, public.inventory_movements, public.inventory_audit_log TO authenticated;
GRANT ALL ON public.inventory_members, public.inventory_locations, public.inventory_categories, public.inventory_products, public.inventory_stock, public.inventory_movements, public.inventory_audit_log TO service_role;

ALTER TABLE public.inventory_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.inventory_role_of(_business uuid, _user uuid)
RETURNS public.inventory_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM provider_profiles WHERE id = _business AND user_id = _user) THEN 'OWNER'::inventory_role
    ELSE (SELECT role FROM inventory_members WHERE business_id = _business AND user_id = _user)
  END
$$;
CREATE OR REPLACE FUNCTION public.inventory_can(_business uuid, _level text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.inventory_role_of(_business, auth.uid())
    WHEN 'OWNER' THEN true
    WHEN 'MANAGER' THEN _level IN ('read','stock','manage')
    WHEN 'INVENTORY_MANAGER' THEN _level IN ('read','stock','manage')
    WHEN 'WAREHOUSE' THEN _level IN ('read','stock')
    WHEN 'VIEWER' THEN _level = 'read'
    ELSE false END
$$;
REVOKE EXECUTE ON FUNCTION public.inventory_role_of(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.inventory_can(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.inventory_role_of(uuid, uuid), public.inventory_can(uuid, text) TO authenticated;

CREATE POLICY "Members read team" ON public.inventory_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.inventory_can(business_id,'read'));
CREATE POLICY "Owner manages team" ON public.inventory_members FOR ALL TO authenticated
  USING (public.inventory_role_of(business_id, auth.uid()) = 'OWNER') WITH CHECK (public.inventory_role_of(business_id, auth.uid()) = 'OWNER');

CREATE POLICY "Read locations" ON public.inventory_locations FOR SELECT TO authenticated USING (public.inventory_can(business_id,'read'));
CREATE POLICY "Add locations" ON public.inventory_locations FOR INSERT TO authenticated WITH CHECK (public.inventory_can(business_id,'manage'));
CREATE POLICY "Edit locations" ON public.inventory_locations FOR UPDATE TO authenticated USING (public.inventory_can(business_id,'manage')) WITH CHECK (public.inventory_can(business_id,'manage'));
CREATE POLICY "Read categories" ON public.inventory_categories FOR SELECT TO authenticated USING (public.inventory_can(business_id,'read'));
CREATE POLICY "Add categories" ON public.inventory_categories FOR INSERT TO authenticated WITH CHECK (public.inventory_can(business_id,'manage'));
CREATE POLICY "Edit categories" ON public.inventory_categories FOR UPDATE TO authenticated USING (public.inventory_can(business_id,'manage')) WITH CHECK (public.inventory_can(business_id,'manage'));
CREATE POLICY "Read products" ON public.inventory_products FOR SELECT TO authenticated USING (public.inventory_can(business_id,'read'));
CREATE POLICY "Add products" ON public.inventory_products FOR INSERT TO authenticated WITH CHECK (public.inventory_can(business_id,'manage'));
CREATE POLICY "Edit products" ON public.inventory_products FOR UPDATE TO authenticated USING (public.inventory_can(business_id,'manage')) WITH CHECK (public.inventory_can(business_id,'manage'));
CREATE POLICY "Read stock" ON public.inventory_stock FOR SELECT TO authenticated USING (public.inventory_can(business_id,'read'));
CREATE POLICY "Read movements" ON public.inventory_movements FOR SELECT TO authenticated USING (public.inventory_can(business_id,'read'));
CREATE POLICY "Read audit" ON public.inventory_audit_log FOR SELECT TO authenticated USING (public.inventory_can(business_id,'manage'));

-- audit triggers
CREATE OR REPLACE FUNCTION public.inventory_audit_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE act text;
BEGIN
  IF TG_OP = 'INSERT' THEN act := 'CREATED';
  ELSIF TG_TABLE_NAME = 'inventory_products' AND OLD.is_active AND NOT NEW.is_active THEN act := 'PRODUCT_DEACTIVATED';
  ELSIF TG_TABLE_NAME = 'inventory_locations' THEN act := 'LOCATION_CHANGED';
  ELSE act := 'EDITED'; END IF;
  IF TG_TABLE_NAME = 'inventory_locations' AND TG_OP = 'INSERT' THEN act := 'LOCATION_ADDED'; END IF;
  IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
  INSERT INTO inventory_audit_log(business_id, actor_id, action, entity, entity_id, previous_value, new_value)
  VALUES (NEW.business_id, auth.uid(), act, TG_TABLE_NAME, NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END, to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE TRIGGER inv_products_audit BEFORE INSERT OR UPDATE ON public.inventory_products FOR EACH ROW EXECUTE FUNCTION public.inventory_audit_trigger();
CREATE TRIGGER inv_locations_audit BEFORE INSERT OR UPDATE ON public.inventory_locations FOR EACH ROW EXECUTE FUNCTION public.inventory_audit_trigger();
CREATE TRIGGER inv_categories_audit BEFORE INSERT ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.inventory_audit_trigger();

-- the only way stock changes
CREATE OR REPLACE FUNCTION public.inventory_record_movement(
  _business uuid, _product uuid, _location uuid, _type public.inventory_movement_type,
  _quantity numeric, _reference text DEFAULT NULL, _reason text DEFAULT NULL,
  _to_location uuid DEFAULT NULL, _unit_cost numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev numeric; nxt numeric; delta numeric; mid uuid; grp uuid; prev2 numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.inventory_can(_business,'stock') THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM inventory_products WHERE id=_product AND business_id=_business AND is_active) THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF NOT EXISTS (SELECT 1 FROM inventory_locations WHERE id=_location AND business_id=_business AND is_active) THEN RAISE EXCEPTION 'LOCATION_NOT_FOUND'; END IF;
  IF _quantity IS NULL OR (_type <> 'COUNT' AND _type <> 'ADJUSTMENT' AND _quantity <= 0) OR (_type = 'COUNT' AND _quantity < 0) THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF _type IN ('ADJUSTMENT','DAMAGE','EXPIRED','COUNT') AND coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  IF _type IN ('TRANSFER_IN','TRANSFER_OUT') THEN
    IF _type = 'TRANSFER_IN' THEN RAISE EXCEPTION 'USE_TRANSFER_OUT'; END IF;
    IF _to_location IS NULL OR _to_location = _location OR NOT EXISTS (SELECT 1 FROM inventory_locations WHERE id=_to_location AND business_id=_business AND is_active) THEN RAISE EXCEPTION 'INVALID_DESTINATION'; END IF;
  END IF;

  INSERT INTO inventory_stock(business_id, product_id, location_id, quantity) VALUES (_business,_product,_location,0) ON CONFLICT DO NOTHING;
  SELECT quantity INTO prev FROM inventory_stock WHERE product_id=_product AND location_id=_location FOR UPDATE;
  IF _type = 'OPENING' AND EXISTS (SELECT 1 FROM inventory_movements WHERE product_id=_product AND location_id=_location) THEN RAISE EXCEPTION 'OPENING_ALREADY_RECORDED'; END IF;

  delta := CASE _type
    WHEN 'OPENING' THEN _quantity WHEN 'PURCHASE' THEN _quantity WHEN 'RETURN' THEN _quantity
    WHEN 'SALE' THEN -_quantity WHEN 'DAMAGE' THEN -_quantity WHEN 'EXPIRED' THEN -_quantity WHEN 'TRANSFER_OUT' THEN -_quantity
    WHEN 'ADJUSTMENT' THEN _quantity WHEN 'COUNT' THEN _quantity - prev END;
  nxt := prev + delta;
  IF nxt < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
  IF _type IN ('ADJUSTMENT') AND delta = 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  grp := CASE WHEN _type = 'TRANSFER_OUT' THEN gen_random_uuid() END;

  UPDATE inventory_stock SET quantity = nxt, updated_at = now() WHERE product_id=_product AND location_id=_location;
  INSERT INTO inventory_movements(business_id, product_id, location_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference, reason, transfer_group, created_by)
  VALUES (_business,_product,_location,_type,delta,prev,nxt,_unit_cost,_reference,_reason,grp,auth.uid()) RETURNING id INTO mid;

  IF _type = 'TRANSFER_OUT' THEN
    INSERT INTO inventory_stock(business_id, product_id, location_id, quantity) VALUES (_business,_product,_to_location,0) ON CONFLICT DO NOTHING;
    SELECT quantity INTO prev2 FROM inventory_stock WHERE product_id=_product AND location_id=_to_location FOR UPDATE;
    UPDATE inventory_stock SET quantity = prev2 + _quantity, updated_at = now() WHERE product_id=_product AND location_id=_to_location;
    INSERT INTO inventory_movements(business_id, product_id, location_id, movement_type, quantity, previous_quantity, new_quantity, reference, reason, transfer_group, created_by)
    VALUES (_business,_product,_to_location,'TRANSFER_IN',_quantity,prev2,prev2+_quantity,_reference,_reason,grp,auth.uid());
  END IF;

  INSERT INTO inventory_audit_log(business_id, actor_id, action, entity, entity_id, previous_value, new_value)
  VALUES (_business, auth.uid(), CASE WHEN delta > 0 THEN 'STOCK_ADDED' WHEN delta < 0 THEN 'STOCK_REMOVED' ELSE 'ADJUSTED' END,
    'inventory_movements', mid, jsonb_build_object('quantity',prev), jsonb_build_object('quantity',nxt,'type',_type));
  RETURN mid;
END $$;
REVOKE EXECUTE ON FUNCTION public.inventory_record_movement FROM anon, public;
GRANT EXECUTE ON FUNCTION public.inventory_record_movement TO authenticated;

-- list businesses I can access
CREATE OR REPLACE FUNCTION public.my_inventory_businesses()
RETURNS TABLE(business_id uuid, business_name text, role public.inventory_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, business_name, 'OWNER'::inventory_role FROM provider_profiles WHERE user_id = auth.uid()
  UNION ALL
  SELECT m.business_id, p.business_name, m.role FROM inventory_members m JOIN provider_profiles p ON p.id = m.business_id WHERE m.user_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.my_inventory_businesses() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_inventory_businesses() TO authenticated;