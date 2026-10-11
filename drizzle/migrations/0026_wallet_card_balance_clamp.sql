ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_card_balance_range;
CREATE OR REPLACE FUNCTION public.clamp_wallet_card_balance()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  NEW.card_balance := LEAST(GREATEST(coalesce(NEW.card_balance, 0), 0), GREATEST(NEW.available_balance, 0));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_clamp_wallet_card_balance ON public.wallets;
CREATE TRIGGER trg_clamp_wallet_card_balance BEFORE INSERT OR UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.clamp_wallet_card_balance();