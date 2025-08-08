export interface EarningInfo {
  date: string;
  eps_actual: string;
  eps_estimate: string;
  revenue_actual: string;
  revenue_estimate: string;
}

export interface TimeBasedData {
  low: string;
  high: string;
  percentage: string;
}

export interface EnhancedStockInfo {
  ticker: string;
  sector: string;
  isxticker: boolean;
  market_cap: string;
  earning_date: string;
  current_price: string;
  today: TimeBasedData;
  previous_day: TimeBasedData;
  five_day: TimeBasedData;
  one_month: TimeBasedData;
  six_month: TimeBasedData;
  one_year: TimeBasedData;
  ah_percentage: string;
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
  isxticker: boolean;
}

export interface StockSummaryData {
  ticker: string;
  currentPrice: string;
  startDateClosePrice: string;
  endDateClosePrice: string;
  percentageChange: string;
  sector: string;
  isxticker: boolean;
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
}

export interface EarningSummaryResponse {
  page: number;
  per_page: number;
  total: number;
  results: EarningData[];
}

export type LeverageFilter = 'Ticker Only' | 'Leverage Only' | 'Both';
export type RefreshInterval = '1M' | '5M' | '15M' | '1H'; 