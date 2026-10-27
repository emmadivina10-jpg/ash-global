import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tells the owner of a profile (member or vendor) that the signed-in member
 * viewed it. The server ignores self-views and notifies at most once a day.
 */
export function useRecordProfileView(viewedUserId: string | null | undefined) {
  useEffect(() => {
    if (!viewedUserId) return;
    void supabase.rpc("record_profile_view", { _viewed_id: viewedUserId });
  }, [viewedUserId]);
}
