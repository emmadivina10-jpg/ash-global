import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStaffAuthenticationAudit } from "@/lib/staff-audit.functions";

export function StaffAuthenticationAudit() {
  const load = useServerFn(getStaffAuthenticationAudit);
  const { data, isPending, error } = useQuery({
    queryKey: ["console", "staff", "authentication-audit"],
    queryFn: load,
  });
  return (
    <section className="space-y-3 border-t border-border pt-6">
      <h2 className="font-display text-xl font-extrabold text-foreground">
        Private authentication audit
      </h2>
      <p className="text-sm text-muted-foreground">
        Credential tests: 4 October 2026, preview and production. Historical results, not continuous
        monitoring. No passwords or roles changed during this audit.
      </p>
      <p className="text-sm text-muted-foreground">
        Staff sign in at /console with a username, not the member email login. Passwords are
        securely hashed and cannot be recovered. All 12 expected employee areas have existing
        accounts.
      </p>
      {isPending ? <p className="text-sm text-muted-foreground">Loading audit…</p> : null}
      {error ? (
        <p className="text-sm text-destructive">The private audit could not be loaded.</p>
      ) : null}
      {data ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                {[
                  "Username",
                  "Email",
                  "Role",
                  "Dashboard",
                  "Account status",
                  "Authentication status",
                  "Permission status",
                  "Dashboard route",
                  "Finding",
                ].map((label) => (
                  <th key={label} className="p-3 align-top font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-border align-top">
                  <td className="p-3 font-semibold">{row.username}</td>
                  <td className="p-3">{row.email ?? "Not set"}</td>
                  <td className="p-3">{row.role}</td>
                  <td className="p-3">{row.dashboard}</td>
                  <td className="p-3">{row.accountStatus}</td>
                  <td className="min-w-48 p-3">{row.authentication}</td>
                  <td className="min-w-48 p-3">{row.permissionStatus}</td>
                  <td className="p-3">{row.route ?? "None"}</td>
                  <td className="min-w-72 p-3">
                    {row.reason}
                    <span className="mt-2 block text-xs text-muted-foreground">
                      Account last updated: {new Date(row.updatedAt).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Account rename/replacement history is not recorded, so it cannot be proven. Employee records
        were last updated on 4 October; CEO and Trust records were not changed. Physical iPhone
        testing: NOT TESTABLE in this audit.
      </p>
    </section>
  );
}
