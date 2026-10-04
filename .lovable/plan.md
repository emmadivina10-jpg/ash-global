# Staff identity, role charters and performance dashboards

Preview only. Nothing is published until every login has been tested.

## 1. Logins (only the ones you approved)
- Existing logins stay as they are: same passwords, same permissions. Nothing is deleted.
- Existing logins get employee details: `ads` = Telma, `ops` = NDJ Martin, `trust` = Armstrong Akuro (Apple reviewer access stays the same), `revenue` = Enjema Peace, `ceo` = Emmanuel.
- New personal logins: support-noubissie, support-lum, support-diana, support-titilope, support-divine (Support access only) and tata-operations (a new Operations department).
- New passwords are created with the existing secure password tool and shared with you once in chat. They never appear on screen or in logs.
- The shared `support` login stays as a "Support Team" login with no individual name.
- Logins with no named employee (growth, sales, partners, content, merchant, expansion, cyber10000) keep working and show "No employee assigned".
- Telma's `ads` login also opens the Growth & Acquisition tools. Her official department stays Advertising / Marketing.

## 2. On every staff dashboard
- **Header:** ASH GLO, department name, employee name, position and employee ID.
- **Your Role:** a letterhead-style card addressed to the employee ("Dear Telma,"), with Role, Mission, Key Responsibilities and KPIs taken word for word from your brief.
- **My Performance:** KPI cards for that department (Today, This Week, This Month, Completed, Pending, conversion or growth), using only real recorded activity.
- **Performance chart:** candlestick-style daily, weekly, monthly or yearly view with moving averages and an Alligator-style trend line, titled for the department (for example "Support Performance"). Below 2 periods of data it shows "Insufficient performance data".
- **Target vs Actual vs Variance:** the CEO sets targets. If no target is set, it shows "No target configured".
- **Trend:** Improving, Stable or Needs Attention, worked out from this period compared with the last, with the percentage change.
- **Leaderboard:** CEO only, comparing members of the same department.
- **Missing data:** if the existing records can't produce a KPI, it shows "Data not available".

## 3. Where the numbers come from
- Support: support tickets, replies, response and resolution times, counted per person once each employee has their own login. Earlier activity on the shared login is counted for the team.
- Marketing / Growth: leads, lead activities and outreach log entries.
- Trust: content reports, moderation actions in the audit log, and verifications.
- Revenue: the existing finance figures, read only. No finance calculations change.
- Marketplace Ops: listings, providers and bookings.
- Operations: department tasks (created, completed, pending, time to close).
- Cybersecurity (CEO): security events.
- No fake or seeded performance data is added.

## 4. CEO oversight
A new "Departments" view lists Marketing, Operations, Support, Trust, Revenue, Marketplace Ops and Cybersecurity, each with its KPIs, targets, trend and employees. Click a department to see its tasks and the issues that need attention.

## 5. Facebook Page (Telma and CEO only)
- Facebook sign-in isn't built in, so this needs your own Meta developer app (App ID and App Secret, added securely). The connection uses Meta's official Page authorization. No Facebook password is ever asked for or stored.
- After connecting, the Facebook Performance panel shows followers, reach, impressions, engagement and clicks for Today, 7, 30 and 90 days. Any figure Meta doesn't provide shows "Data unavailable".
- Until the Meta app is set up and connected, the panel shows "Connect Facebook Page". Linking Facebook activity to leads is the first step only, because Meta doesn't share who clicked.
- Meta may also need to review the app before Page insights work for your account.

## Technical details
- `staff_accounts`: add columns `employee_name`, `position`, `employee_id`, `extra_departments text[]`. Add `OPERATIONS` to DEPARTMENTS. Insert the 6 new seats with scrypt hashes from `hashStaffPassword`.
- `allowedNav` and `requireDepartment` also accept `extra_departments`, which is how Telma gets GROWTH. No other permission changes.
- `support_tickets` and `support_ticket_messages`: if there is no staff attribution column, add a nullable `staff_id` and record it from the moment the session starts.
- New `staff-performance.functions.ts` with per-department real-data series. Targets use the existing `staff_targets` table, edited by the CEO only.
- New `DepartmentCommandCenter` component, mounted at the top of each department route. The chart is an SVG (OHLC per bucket, SMA, Alligator 13/8/5).
- New `/console/departments` route for the CEO.
- Facebook: `META_APP_ID` and `META_APP_SECRET` secrets, an OAuth callback under `/api/public/meta/callback` with signed state, and an encrypted Page token stored server-side.
- Testing: Playwright logs in with every seat on preview and checks the name, department, ID, role card, KPIs, chart and that the permissions are correct.
