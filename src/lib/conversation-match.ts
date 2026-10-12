export type DirectThread = { id: string; client_id: string; owner_id?: string | null; provider_id?: string | null; group_id?: string | null };
/** Rows are newest first. Both storefront and member threads refer to the same seller. */
export function findSellerConversation(rows: DirectThread[], me: string, seller: string, providerId: string) {
  return rows.find(row => !row.group_id && (
    (row.provider_id === providerId && row.client_id === me) ||
    (row.client_id === me && row.owner_id === seller) ||
    (row.client_id === seller && row.owner_id === me)
  ));
}
