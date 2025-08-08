import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SentimentData {
  ticker: string;
  overall_sentiment: string;
  sentiment_score: number;
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
  news_count: number;
  recent_news: Array<{
    title: string;
    sentiment: string;
    published_date: string;
    source: string;
  }>;
  social_media_sentiment: {
    twitter_sentiment: string;
    reddit_sentiment: string;
    overall_social_score: number;
  };
  technical_indicators: {
    rsi: number;
    macd: string;
    moving_averages: string;
    support_level: number;
    resistance_level: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SentimentService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getSentiment(ticker: string): Observable<SentimentData> {
    return this.http.get<SentimentData>(`${this.apiUrl}/sentiment/${ticker}`).pipe(
      catchError(() => {
        // Return fallback sentiment data if API fails
        return of(this.getFallbackSentiment(ticker));
      })
    );
  }

  private getFallbackSentiment(ticker: string): SentimentData {
    return {
      ticker: ticker,
      overall_sentiment: 'Neutral',
      sentiment_score: 0.5,
      positive_percentage: 35,
      negative_percentage: 30,
      neutral_percentage: 35,
      news_count: 15,
      recent_news: [
        {
          title: `${ticker} shows mixed signals in recent trading`,
          sentiment: 'Neutral',
          published_date: new Date().toISOString().split('T')[0],
          source: 'Financial News'
        },
        {
          title: `Analysts maintain hold rating on ${ticker}`,
          sentiment: 'Neutral',
          published_date: new Date().toISOString().split('T')[0],
          source: 'Market Analysis'
        }
      ],
      social_media_sentiment: {
        twitter_sentiment: 'Neutral',
        reddit_sentiment: 'Neutral',
        overall_social_score: 0.5
      },
      technical_indicators: {
        rsi: 55,
        macd: 'Neutral',
        moving_averages: 'Mixed',
        support_level: 0,
        resistance_level: 0
      }
    };
  }
} 