/** Official role charters per department. Wording comes from the owner's brief; do not invent roles. */
export type Charter = {
  key: string;
  label: string;
  chartTitle: string;
  chartSubtitle: string;
  mission: string;
  responsibilities: string[];
  kpis: string[];
  extraNote?: string;
};

const SUPPORT: Charter = {
  key: "SUPPORT",
  label: "Support",
  chartTitle: "Support Performance",
  chartSubtitle: "Service performance trend · replies sent",
  mission: "Provide fast, professional and effective assistance to ASH members, businesses and platform users.",
  responsibilities: [
    "Respond to support requests", "Resolve customer issues", "Handle complaints",
    "Escalate technical/safety issues", "Track unresolved cases", "Follow up with users", "Maintain service quality",
  ],
  kpis: ["Tickets received", "Tickets resolved", "Average response time", "Average resolution time", "Open tickets", "Customer satisfaction", "Escalation rate"],
};

const MARKETING: Charter = {
  key: "ADVERTISING",
  label: "Advertising / Marketing",
  chartTitle: "Marketing Performance",
  chartSubtitle: "Growth trend · leads generated",
  mission: "Increase ASH visibility, generate qualified opportunities and contribute measurable user/business growth.",
  responsibilities: [
    "Marketing campaigns", "Lead generation", "Business outreach", "User acquisition", "Provider/merchant acquisition",
    "Prospect follow-up", "Market research", "Campaign tracking", "Lead conversion", "Growth reporting",
  ],
  kpis: ["Leads generated", "Leads contacted", "Qualified leads", "Registered users/businesses", "Activated users/businesses", "Conversion rate", "Campaign performance", "Retention"],
  extraNote: "Growth & Acquisition / Lead Generation responsibilities are included in this role.",
};

const CHARTERS: Record<string, Charter> = {
  SUPPORT,
  ADVERTISING: MARKETING,
  OPERATIONS: {
    key: "OPERATIONS",
    label: "Operations",
    chartTitle: "Operations Performance",
    chartSubtitle: "Operations efficiency trend · tasks completed",
    mission: "Ensure ASH operational activities run efficiently and issues are identified and resolved quickly.",
    responsibilities: [
      "Monitor operational workflows", "Track operational tasks", "Identify bottlenecks", "Coordinate internal operations",
      "Track completion rates", "Escalate operational issues", "Monitor service efficiency", "Report operational performance",
    ],
    kpis: ["Tasks completed", "Tasks pending", "Resolution time", "Operational efficiency", "Issues resolved", "Completion rate"],
  },
  TRUST: {
    key: "TRUST",
    label: "Trust & Verification",
    chartTitle: "Trust & Safety",
    chartSubtitle: "Safety performance trend · reports resolved",
    mission: "Protect the ASH ecosystem through verification, trust, safety and responsible moderation.",
    responsibilities: [
      "Review verification requests", "Review safety reports", "Investigate reported content", "Handle user safety issues",
      "Monitor suspicious activity", "Apply moderation procedures", "Escalate serious cases", "Maintain trust standards",
    ],
    kpis: ["Verifications completed", "Reports reviewed", "Average review time", "Cases resolved", "Suspensions", "Bans", "Safety response time"],
  },
  REVENUE: {
    key: "REVENUE",
    label: "Revenue / Finance",
    chartTitle: "Revenue Performance",
    chartSubtitle: "Revenue trend · paid activation fees (XAF)",
    mission: "Monitor ASH financial performance and provide accurate financial intelligence.",
    responsibilities: [
      "Monitor revenue", "Track expenses", "Reconcile financial activity", "Monitor payouts", "Monitor platform income",
      "Review financial ledger", "Track profit/loss", "Analyze financial growth", "Prepare financial reports",
    ],
    kpis: ["Revenue", "Expenses", "Net profit", "Revenue growth", "Profit growth", "Payouts", "Reconciliation status", "Financial variance"],
  },
  MARKETPLACE_OPS: {
    key: "MARKETPLACE_OPS",
    label: "Marketplace Operations",
    chartTitle: "Marketplace Performance",
    chartSubtitle: "Marketplace activity trend · bookings created",
    mission: "Maintain an efficient and healthy ASH marketplace ecosystem.",
    responsibilities: [
      "Monitor marketplace activity", "Support merchants/providers", "Monitor listings", "Track marketplace transactions",
      "Identify marketplace problems", "Support marketplace growth", "Coordinate operational issues",
    ],
    kpis: ["Active listings", "Active providers", "Marketplace transactions", "Completed transactions", "Cancelled transactions", "Marketplace growth", "Resolution time"],
  },
  SUPER_ADMIN: {
    key: "SUPER_ADMIN",
    label: "Executive / Cybersecurity",
    chartTitle: "Cybersecurity",
    chartSubtitle: "Security activity trend · security events recorded",
    mission: "Provide executive leadership while maintaining strategic oversight of ASH cybersecurity and platform security.",
    responsibilities: [
      "Executive decision-making", "Strategic planning", "Platform oversight", "Cybersecurity oversight",
      "Risk management", "Security monitoring", "Business growth oversight", "Department performance oversight",
    ],
    kpis: ["Platform growth", "Revenue growth", "User growth", "Security incidents", "Security response", "Department performance", "Strategic objectives"],
  },
};
CHARTERS.CYBERSECURITY = { ...CHARTERS.SUPER_ADMIN, key: "CYBERSECURITY", label: "Cybersecurity" };

const GENERIC: Record<string, string> = {
  GROWTH: "Growth & Acquisition", SALES: "Sales", PARTNERSHIPS: "Partnerships", CONTENT: "Content & Creator",
  MERCHANT: "Merchant", EXPANSION: "Expansion",
};

export function charterFor(department: string): Charter {
  if (CHARTERS[department]) return CHARTERS[department];
  const label = GENERIC[department] ?? department.replace(/_/g, " ");
  return {
    key: department, label, chartTitle: `${label} Performance`, chartSubtitle: "Activity trend · leads recorded",
    mission: "No official role charter has been issued for this department yet.",
    responsibilities: [], kpis: [],
  };
}

/** Departments shown in the CEO oversight view, in the brief's order. */
export const OVERSIGHT_DEPARTMENTS = ["ADVERTISING", "OPERATIONS", "SUPPORT", "TRUST", "REVENUE", "MARKETPLACE_OPS", "CYBERSECURITY"] as const;
