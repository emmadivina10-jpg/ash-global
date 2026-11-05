export const SHARE_SITE = "https://ashglogroup.company";

export function shareLink(kind: "post" | "spotlight" | "store" | "property", id: string) {
  return kind === "store" ? `${SHARE_SITE}/s/${id}` : `${SHARE_SITE}/share/${kind}/${id}`;
}
