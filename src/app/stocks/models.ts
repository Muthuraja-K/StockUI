export interface EarningInfo {
  date: string;
  eps_actual: string;
  eps_estimate: string;
  revenue_actual: string;
  revenue_estimate: string;
}

export interface TimeBasedData {
  low: number;
  high: number;
  open: number;
  close: number;
  percentage: string;
  high_low_percentage: string;
  range?: string;
  display?: string; // New field for clean formatting: "L: $23.00 H: $25.00 -6.43%"
}

// New interface for today's data from API
export interface TodayData {
  low: number;
  high: number;
  open: number;
  close: number;
  prev_close: number;
  ah_change: string;
  change: string;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
}

export interface EnhancedStockInfo {
  ticker: string;
  sector: string;
  isleverage: boolean;
  market_cap: string;
  pe_ratio?: string;
  earning_date: string;
  price: string;
  after_hour_price: string;
  volume: number;
  today: TodayData;
  last_updated: string;
  // New period fields with updated structure
  '1D'?: TimeBasedData;
  '5D'?: TimeBasedData;
  '1M'?: TimeBasedData;
  '6M'?: TimeBasedData;
  '1Y'?: TimeBasedData;
}

// New interface for stock history data
export interface StockHistoryData {
  ticker: string;
  sector: string;
  isleverage: boolean;
  market_cap: string;
  earning_date: string;
  current_price: string;
  today: TimeBasedData;
  previous_day: TimeBasedData;
  five_day: TimeBasedData;
  one_month: TimeBasedData;
  six_month: TimeBasedData;
  one_year: TimeBasedData;
}

export interface StockInfo {
  Sector: string;
  Ticker: string;
  MarketCap: string;
  PE: string;
  NextEarningDate: string;
  CurrentPrice: string;
  TodayLow: string;
  TodayHigh: string;
  TodayPercentageChange: string;
  PreviousDayLow: string;
  PreviousDayHigh: string;
  PreviousDayClose: string;
  PreviousDayPercentageChange: string;
  FiveDayLow: string;
  FiveDayHigh: string;
  FiveDayPercentageChange: string;
  OneMonthLow: string;
  OneMonthHigh: string;
  OneMonthPercentageChange: string;
  SixMonthLow: string;
  SixMonthHigh: string;
  SixMonthPercentageChange: string;
  OneYearLow: string;
  OneYearHigh: string;
  OneYearPercentageChange: string;
  EarningsData: EarningInfo[];
  isleverage: boolean;
}

// New interface for stock management (add/edit forms)
export interface StockManagementData {
  ticker: string;
  sector: string;
  isleverage: boolean;
}

// Option-related interfaces for sentiment popup
export interface OptionData {
  ticker: string;
  expiration_date: string;
  strike_price: number;
  option_type: 'call' | 'put';
  last_price: number;
  bid: number;
  ask: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  in_the_money: boolean;
}

export interface OptionChain {
  ticker: string;
  current_price: number;
  expiration_dates: string[];
  calls: OptionData[];
  puts: OptionData[];
  last_updated: string;
}

export interface StockSummaryData {
  ticker: string;
  currentPrice: string;
  startDateClosePrice: string;
  endDateClosePrice: string;
  percentageChange: string;
  sector: string;
  isleverage: boolean;
}

export interface SectorGroup {
  sector: string;
  averagePercentage: string;
  stocks: StockSummaryData[];
  expanded: boolean;
}

export interface StockSummaryResponse {
  groups: SectorGroup[];
}

export interface EarningData {
  ticker: string;
  currentPrice: string;
  earningDate: string;
  sector: string;
  lastTwoEarnings?: LastEarningData[];
}

export interface LastEarningData {
  earningDate: string;
  closeB4EarningPrice: string;
  closeB4EarningChange: string;
  afterEarningPrice: string;
  afterEarningChange: string;
  beatExpectation: string;
  actualValue: string;
  expectedValue: string;
  epsCategory: string;
  actualRevenue: string;
  expectedRevenue: string;
  revenueCategory: string;
  percentageDifference: string;
}

export interface EarningSummaryResponse {
  page: number;
  per_page: number;
  total: number;
  results: EarningData[];
}

export type LeverageFilter = 'Ticker Only' | 'Leverage Only' | 'Both';
export type RefreshInterval = '1M' | '5M' | '15M' | '1H'; 