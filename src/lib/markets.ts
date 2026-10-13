export type MarketCategory = "FX" | "Stocks" | "Crypto" | "Indices" | "Commodities";
export type MarketRange = "1H" | "4H" | "1D" | "1W" | "1M" | "1Y";

export type MarketPoint = { label: string; value: number };

export type FxMarket = {
  symbol: string;
  name: string;
  price: string;
  change: number;
  trend: MarketPoint[];
};

const values = (series: number[]): MarketPoint[] =>
  series.map((value, index) => ({ label: String(index + 1), value }));

export const MARKET_CATEGORIES: MarketCategory[] = [
  "FX",
  "Stocks",
  "Crypto",
  "Indices",
  "Commodities",
];
export const MARKET_RANGES: MarketRange[] = ["1H", "4H", "1D", "1W", "1M", "1Y"];

export const FX_MARKETS: FxMarket[] = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    price: "1.0842",
    change: 0.28,
    trend: values([1.081, 1.083, 1.082, 1.085, 1.084, 1.086, 1.0842]),
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    price: "1.2728",
    change: -0.16,
    trend: values([1.276, 1.274, 1.275, 1.272, 1.273, 1.271, 1.2728]),
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    price: "149.61",
    change: 0.42,
    trend: values([148.8, 149.1, 149, 149.4, 149.2, 149.7, 149.61]),
  },
  {
    symbol: "XAU/USD",
    name: "Gold / US Dollar",
    price: "2,334.70",
    change: -0.31,
    trend: values([2345, 2342, 2338, 2341, 2335, 2331, 2334.7]),
  },
];

export const EUR_USD_SERIES: Record<MarketRange, MarketPoint[]> = {
  "1H": values([1.0829, 1.0834, 1.0831, 1.0838, 1.0835, 1.0844, 1.0842]),
  "4H": values([1.0812, 1.0826, 1.0819, 1.0838, 1.0831, 1.085, 1.0842]),
  "1D": values([1.0798, 1.0812, 1.0804, 1.0827, 1.0819, 1.0851, 1.0842]),
  "1W": values([1.076, 1.081, 1.078, 1.086, 1.083, 1.088, 1.0842]),
  "1M": values([1.069, 1.074, 1.071, 1.082, 1.078, 1.089, 1.0842]),
  "1Y": values([1.052, 1.091, 1.067, 1.104, 1.072, 1.098, 1.0842]),
};

export const MARKET_STATS = [
  { label: "Day High", value: "1.0861" },
  { label: "Day Low", value: "1.0798" },
  { label: "52W High", value: "1.1276" },
  { label: "52W Low", value: "1.0448" },
];

export const ANALYSIS_ITEMS = [
  {
    title: "EUR/USD Market Overview",
    body: "The euro-dollar pair is being influenced by interest-rate expectations, inflation data, economic growth, and broader U.S. dollar movements.",
  },
  {
    title: "What's Moving the Forex Market?",
    body: "Major currency movements can be affected by central-bank decisions, economic releases, geopolitical developments, and changes in market expectations.",
  },
  {
    title: "Technical Market Observation",
    body: "Price action, trend structure, support and resistance levels, and momentum indicators can be used as analytical tools when studying a market.",
  },
];

export const MARKET_NEWS = [
  {
    headline: "Currency markets assess the latest inflation outlook",
    summary:
      "Market participants are reviewing how recent inflation trends may influence future monetary policy expectations.",
    time: "35 min ago",
    category: "Currencies",
    source: "ASH Markets Demo",
  },
  {
    headline: "Dollar movement remains in focus ahead of economic releases",
    summary:
      "Upcoming growth and employment figures are among the data points being watched across major currency pairs.",
    time: "2 hr ago",
    category: "Economy",
    source: "ASH Markets Demo",
  },
  {
    headline: "Central-bank expectations shape a measured FX session",
    summary:
      "Interest-rate expectations continue to contribute to short-term changes in major exchange rates.",
    time: "4 hr ago",
    category: "Central Banks",
    source: "ASH Markets Demo",
  },
];

export const ECONOMIC_EVENTS = [
  {
    country: "US",
    event: "U.S. CPI",
    date: "Oct 13 · 12:30 UTC",
    importance: "High",
    expected: "—",
    previous: "—",
  },
  {
    country: "US",
    event: "Federal Reserve Interest Rate Decision",
    date: "Oct 28 · 18:00 UTC",
    importance: "High",
    expected: "—",
    previous: "—",
  },
  {
    country: "EU",
    event: "ECB Interest Rate Decision",
    date: "Oct 30 · 12:15 UTC",
    importance: "High",
    expected: "—",
    previous: "—",
  },
  {
    country: "US",
    event: "Non-Farm Payrolls",
    date: "Nov 6 · 13:30 UTC",
    importance: "High",
    expected: "—",
    previous: "—",
  },
  {
    country: "GB",
    event: "GDP Release",
    date: "Nov 12 · 07:00 UTC",
    importance: "Medium",
    expected: "—",
    previous: "—",
  },
];

export const LEARNING_ITEMS = [
  {
    title: "Forex Basics",
    description: "Learn how currencies are quoted and why exchange rates move.",
  },
  {
    title: "Understanding Candlesticks",
    description: "Read open, high, low, and close information in a price chart.",
  },
  {
    title: "Risk Management",
    description: "Understand exposure, uncertainty, and disciplined market study.",
  },
  {
    title: "Economic Indicators",
    description: "Explore how inflation, jobs, and growth data affect expectations.",
  },
  {
    title: "Technical Analysis",
    description: "Study trends, levels, momentum, and price structure.",
  },
];
