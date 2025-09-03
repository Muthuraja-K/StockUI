import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface SentimentData {
  ticker: string;
  overall_sentiment: string;
  sentiment_score: number;
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
  news_count: number;
  recent_news: NewsItem[];
  major_holders: MajorHolders;
  top_institutional_holders: InstitutionalHolders;
  top_mutual_fund_holders: InstitutionalHolders;
  individual_holdings: IndividualHoldings;
  social_media_sentiment: {
    twitter_sentiment: string;
    reddit_sentiment: string;
    overall_social_score: number;
  };
  technical_indicators: {
    rsi: string;
    macd: string;
    moving_averages: string;
    support_level: string;
    resistance_level: string;
  };
  option_data?: {
    expiration_dates: string[];
    calls: any[];
    puts: any[];
    last_updated: string;
    error?: string;
  };
}

export interface NewsItem {
  title: string;
  source: string;
  published_date: string;
  sentiment: string;
  url?: string;
}

export interface MajorHolders {
  insider_percentage: number;
  institutional_percentage: number;
  retail_percentage: number;
  total_percentage: number;
}

export interface InstitutionalHolders {
  total_percentage_held: number;
  holdings: Holding[];
}

export interface Holding {
  holder: string;
  shares: number;
  date_reported: string;
  percentage_out: number;
  value: number;
}

export interface IndividualHoldings {
  total_percentage: number;
  holdings: Holding[];
}

@Injectable({
  providedIn: 'root'
})
export class SentimentService {
  private apiUrl = environment.stockApiBaseUrl;

  constructor(private http: HttpClient) { }

  getSentiment(ticker: string): Observable<SentimentData> {
    return this.http.get<SentimentData>(`${this.apiUrl}/api/sentiment/${ticker}`);
  }

  getSentimentAnalysis(ticker: string): Observable<SentimentData> {
    return this.http.get<SentimentData>(`${this.apiUrl}/api/sentiment/analysis/${ticker}`);
  }

  getNewsSentiment(ticker: string): Observable<NewsItem[]> {
    return this.http.get<NewsItem[]>(`${this.apiUrl}/api/sentiment/news/${ticker}`);
  }

  getHoldingsData(ticker: string): Observable<{
    major_holders: MajorHolders;
    institutional_holders: InstitutionalHolders;
    mutual_fund_holders: InstitutionalHolders;
    individual_holdings: IndividualHoldings;
  }> {
    return this.http.get<{
      major_holders: MajorHolders;
      institutional_holders: InstitutionalHolders;
      mutual_fund_holders: InstitutionalHolders;
      individual_holdings: IndividualHoldings;
    }>(`${this.apiUrl}/api/sentiment/holdings/${ticker}`);
  }
}
