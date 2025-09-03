import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockPredictionService, StockPredictionResponse, StockPredictionSummary } from '../service/stock-prediction.service';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';
import { registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'stock-prediction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-prediction.component.html',
  styleUrls: ['./stock-prediction.component.scss'],
})
export class StockPredictionComponent implements AfterViewInit, OnDestroy {
  // Form inputs
  ticker: string = '';
  selectedModelType: 'lstm' | 'regression' | 'both' = 'both'; // Removed 'chatgpt'
  predictionDays: number = 30;
  
  // Component state
  loading = false;
  hasSearched = false;
  error: string | null = null;
  viewMode: 'chat' | 'table' | 'chart' | 'both' = 'chart'; // Default to chart view
  
  // Results
  predictionResult: StockPredictionResponse | null = null;
  predictionSummary: StockPredictionSummary | null = null;
  
  // Chart references
  @ViewChild('priceChartCanvas') priceChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('predictionChartCanvas') predictionChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('confidenceChartCanvas') confidenceChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Chart instances
  private priceChart: Chart | null = null;
  private predictionChart: Chart | null = null;
  private confidenceChart: Chart | null = null;
  
  // Model type options
  modelTypes = [
    { value: 'lstm', label: 'LSTM Neural Network', description: 'Deep learning price prediction model' },
    { value: 'regression', label: 'Linear Regression', description: 'Statistical trend analysis model' },
    { value: 'both', label: 'Combined Models', description: 'All three models for comprehensive analysis' }
  ];
  
  // Days options
  daysOptions = [
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' },
    { value: 60, label: '2 Months' },
    { value: 90, label: '3 Months' }
  ];

  constructor(private stockPredictionService: StockPredictionService) {}

  ngOnInit() {
    // Component initialization
  }

  ngAfterViewInit() {
    // Charts will be initialized when data is available
  }

  ngOnDestroy() {
    // Clean up charts to prevent memory leaks
    this.destroyCharts();
  }

  // Chart management methods
  private destroyCharts() {
    if (this.priceChart) {
      this.priceChart.destroy();
      this.priceChart = null;
    }
    if (this.predictionChart) {
      this.predictionChart.destroy();
      this.predictionChart = null;
    }
    if (this.confidenceChart) {
      this.confidenceChart.destroy();
      this.confidenceChart = null;
    }
  }

  private createPriceChart() {
    console.log('createPriceChart called', {
      hasCanvas: !!this.priceChartCanvas,
      hasResults: !!this.predictionResult,
      canvasElement: this.priceChartCanvas?.nativeElement
    });
    if (!this.priceChartCanvas?.nativeElement || !this.predictionResult) {
      console.log('Skipping price chart creation - missing canvas or data');
      return;
    }

    const ctx = this.priceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (this.priceChart) {
      this.priceChart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: this.getChartLabels(),
        datasets: [
          {
            label: 'Historical Prices',
            data: this.getHistoricalPrices(),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1
          },
          {
            label: 'LSTM Predictions',
            data: this.getLSTMPredictions(),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            borderDash: [5, 5]
          },
          {
            label: 'Regression Predictions',
            data: this.getRegressionPredictions(),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            borderDash: [10, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${this.ticker} Price Predictions`
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Price ($)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    };

    this.priceChart = new Chart(ctx, config);
  }

  private createPredictionChart() {
    if (!this.predictionChartCanvas || !this.predictionResult) return;

    const ctx = this.predictionChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (this.predictionChart) {
      this.predictionChart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: this.getPredictionLabels(),
        datasets: [
          {
            label: 'LSTM Predictions',
            data: this.getLSTMPredictionChanges(),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: '#10b981',
            borderWidth: 1
          },
          {
            label: 'Regression Predictions',
            data: this.getRegressionPredictionChanges(),
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderColor: '#f59e0b',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Predicted Price Changes (%)'
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Change (%)'
            }
          }
        }
      }
    };

    this.predictionChart = new Chart(ctx, config);
  }

  private createConfidenceChart() {
    if (!this.confidenceChartCanvas || !this.predictionResult) return;

    const ctx = this.confidenceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (this.confidenceChart) {
      this.confidenceChart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'doughnut' as ChartType,
      data: {
        labels: ['LSTM Confidence', 'Regression Confidence'],
        datasets: [{
          data: [
            this.predictionResult.lstm_prediction?.confidence || 0,
            this.predictionResult.regression_prediction?.confidence || 0
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)'
          ],
          borderColor: [
            '#10b981',
            '#f59e0b'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Model Confidence Levels'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    };

    this.confidenceChart = new Chart(ctx, config);
  }

  // Helper methods for chart data
  private getChartLabels(): string[] {
    if (!this.predictionResult) return [];
    
    const labels = [];
    
    // Add historical dates (last 30 days)
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString());
    }
    
    // Add prediction dates
    if (this.predictionResult.lstm_prediction?.prediction_dates) {
      labels.push(...this.predictionResult.lstm_prediction.prediction_dates);
    }
    
    return labels;
  }

  private getHistoricalPrices(): number[] {
    if (!this.predictionResult) return [];
    
    const prices = [];
    const currentPrice = this.predictionResult.current_price;
    
    // Generate mock historical prices (in real app, this would come from API)
    for (let i = 29; i >= 0; i--) {
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      prices.push(currentPrice * (1 + variation));
    }
    
    return prices;
  }

  private getLSTMPredictions(): number[] {
    if (!this.predictionResult?.lstm_prediction?.predictions) return [];
    
    // Pad with nulls for historical period
    const nulls = Array(30).fill(null);
    return [...nulls, ...this.predictionResult.lstm_prediction.predictions];
  }

  private getRegressionPredictions(): number[] {
    if (!this.predictionResult?.regression_prediction?.predictions) return [];
    
    // Pad with nulls for historical period
    const nulls = Array(30).fill(null);
    return [...nulls, ...this.predictionResult.regression_prediction.predictions];
  }

  private getPredictionLabels(): string[] {
    if (!this.predictionResult?.lstm_prediction?.prediction_dates) return [];
    return this.predictionResult.lstm_prediction.prediction_dates;
  }

  private getLSTMPredictionChanges(): number[] {
    if (!this.predictionResult?.lstm_prediction?.predictions) return [];
    
    const currentPrice = this.predictionResult.current_price;
    return this.predictionResult.lstm_prediction.predictions.map((price: number) => 
      ((price - currentPrice) / currentPrice) * 100
    );
  }

  private getRegressionPredictionChanges(): number[] {
    if (!this.predictionResult?.regression_prediction?.predictions) return [];
    
    const currentPrice = this.predictionResult.current_price;
    return this.predictionResult.regression_prediction.predictions.map((price: number) => 
      ((price - currentPrice) / currentPrice) * 100
    );
  }

  // Update charts when new data arrives
  private updateCharts() {
    console.log('updateCharts called, predictionResult:', !!this.predictionResult);
    if (this.predictionResult) {
      setTimeout(() => {
        console.log('Creating charts...');
        this.createPriceChart();
        this.createPredictionChart();
        this.createConfidenceChart();
      }, 100);
    }
  }

  // Force chart recreation (useful for view mode changes)
  forceRecreateCharts() {
    console.log('forceRecreateCharts called');
    if (!this.predictionResult) {
      console.log('No prediction result, skipping chart recreation');
      return;
    }

    // Destroy existing charts first
    this.destroyCharts();

    // Wait for DOM to update, then recreate
    setTimeout(() => {
      console.log('Force recreating charts after view change...');
      console.log('Canvas elements available:', {
        price: !!this.priceChartCanvas?.nativeElement,
        prediction: !!this.predictionChartCanvas?.nativeElement,
        confidence: !!this.confidenceChartCanvas?.nativeElement
      });
      
      this.createPriceChart();
      this.createPredictionChart();
      this.createConfidenceChart();
    }, 300);
  }

  onTickerChange() {
    this.ticker = this.ticker.toUpperCase().trim();
    this.error = null;
  }

  onModelTypeChange() {
    this.error = null;
  }

  onDaysChange() {
    this.error = null;
  }

  setViewMode(mode: 'chat' | 'table' | 'chart' | 'both') {
    console.log(`Setting view mode from '${this.viewMode}' to '${mode}'`);
    const previousMode = this.viewMode;
    this.viewMode = mode;
    console.log(`View mode is now: '${this.viewMode}'`);
    console.log(`Should show chat: ${this.viewMode === 'chat' || this.viewMode === 'both'}`);
    console.log(`Should show table: ${this.viewMode === 'table' || this.viewMode === 'both'}`);
    console.log(`Should show charts: ${this.viewMode === 'chart' || this.viewMode === 'both'}`);
    console.log(`Should show charts (shouldShowCharts): ${this.shouldShowCharts()}`);
    
    // If switching to a mode that shows charts and we have data, recreate charts
    const shouldShowChartsNow = (this.viewMode === 'chart' || this.viewMode === 'both') && this.shouldShowCharts();
    const wasShowingCharts = (previousMode === 'chart' || previousMode === 'both');
    
    if (shouldShowChartsNow && !wasShowingCharts && this.predictionResult) {
      console.log('Recreating charts because view switched to show charts');
      // Force recreation with longer timeout for view mode changes
      this.forceRecreateCharts();
    }
  }

  // Debug method to check current view state
  getCurrentViewState() {
    return {
      currentViewMode: this.viewMode,
      shouldShowChat: this.viewMode === 'chat' || this.viewMode === 'both',
      shouldShowTable: this.viewMode === 'table' || this.viewMode === 'both',
      shouldShowCharts: this.shouldShowCharts(),
      hasResults: !!this.predictionResult
    };
  }

  validateInputs(): boolean {
    if (!this.ticker || this.ticker.trim() === '') {
      this.error = 'Please enter a stock ticker symbol';
      return false;
    }
    
    if (this.ticker.length < 1 || this.ticker.length > 10) {
      this.error = 'Ticker symbol must be between 1 and 10 characters';
      return false;
    }
    
    if (this.predictionDays < 1 || this.predictionDays > 90) {
      this.error = 'Prediction days must be between 1 and 90';
      return false;
    }
    
    return true;
  }

  async getStockPrediction() {
    if (!this.validateInputs()) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.hasSearched = true;

    try {
      // Get full prediction
      this.stockPredictionService.getStockPrediction(
        this.ticker,
        this.selectedModelType,
        this.predictionDays
      ).subscribe({
        next: (result) => {
          console.log('Stock Prediction API Response:', result); // Debug log
          if (result.error) {
            this.error = result.error;
            this.predictionResult = null;
          } else {
            this.predictionResult = result;
            this.error = null;
            // Update charts with new data
            this.updateCharts();
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Stock Prediction API Error:', err); // Debug log
          this.error = `Failed to get prediction: ${err.message || 'Unknown error'}`;
          this.predictionResult = null;
          this.loading = false;
        }
      });

      // Get prediction summary
      this.stockPredictionService.getStockPredictionSummary(
        this.ticker,
        this.selectedModelType
      ).subscribe({
        next: (summary) => {
          if (!summary.error) {
            this.predictionSummary = summary;
          }
        },
        error: (err) => {
          console.warn('Failed to get prediction summary:', err);
        }
      });

    } catch (error) {
      this.error = `Unexpected error: ${error}`;
      this.loading = false;
    }
  }

  clearResults() {
    this.predictionResult = null;
    this.predictionSummary = null;
    this.error = null;
    this.hasSearched = false;
    // Destroy charts when clearing results
    this.destroyCharts();
  }

  getModelDescription(modelType: string): string {
    const model = this.modelTypes.find(m => m.value === modelType);
    return model ? model.description : '';
  }

  getRecommendationClass(recommendation: string): string {
    switch (recommendation?.toUpperCase()) {
      case 'BUY': return 'recommendation-buy';
      case 'SELL': return 'recommendation-sell';
      case 'HOLD': return 'recommendation-hold';
      default: return 'recommendation-neutral';
    }
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    if (confidence >= 0.4) return 'confidence-low';
    return 'confidence-very-low';
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  formatPercentage(percentage: number): string {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  formatConfidence(confidence: number): string {
    return `${(confidence * 100).toFixed(1)}%`;
  }

  // Helper methods for conditional display
  hasLSTMPrediction(): boolean {
    return !!(this.predictionResult?.lstm_prediction?.status === 'success');
  }

  hasRegressionPrediction(): boolean {
    return !!(this.predictionResult?.regression_prediction?.status === 'success');
  }

  hasCombinedPrediction(): boolean {
    return !!(this.predictionResult?.combined_prediction?.status === 'success');
  }

  hasAnyPrediction(): boolean {
    return this.hasLSTMPrediction() || this.hasRegressionPrediction() || this.hasCombinedPrediction();
  }

  // Quick summary is useful for all models
  shouldShowQuickSummary(): boolean {
    return true; // Always show since ChatGPT is removed
  }

  shouldShowCharts(): boolean {
    // Charts are only useful for models that provide numerical predictions
    return this.shouldShowPricePredictions() && this.predictionResult !== null;
  }

  shouldShowPricePredictions(): boolean {
    // Only show price predictions for models that provide numerical predictions
    return this.selectedModelType === 'lstm' || this.selectedModelType === 'regression' || this.selectedModelType === 'both';
  }

  getPredictionChartData() {
    if (!this.predictionResult) return null;

    const chartData: any = {
      labels: [],
      datasets: []
    };

    // Add current price
    chartData.labels.push('Current');
    chartData.datasets.push({
      label: 'Current Price',
      data: [this.predictionResult.current_price],
      borderColor: '#2196F3',
      backgroundColor: '#2196F3',
      pointRadius: 6
    });

    // Add LSTM predictions
    if (this.hasLSTMPrediction()) {
      const lstmData = this.predictionResult.lstm_prediction;
      const predictions = lstmData.predictions || [];
      const dates = lstmData.prediction_dates || [];
      
      chartData.labels.push(...dates);
      chartData.datasets.push({
        label: 'LSTM Prediction',
        data: [this.predictionResult.current_price, ...predictions],
        borderColor: '#4CAF50',
        backgroundColor: '#4CAF50',
        pointRadius: 4
      });
    }

    // Add Regression predictions
    if (this.hasRegressionPrediction()) {
      const regressionData = this.predictionResult.regression_prediction;
      const predictions = regressionData.predictions || [];
      const dates = regressionData.prediction_dates || [];
      
      chartData.datasets.push({
        label: 'Regression Prediction',
        data: [this.predictionResult.current_price, ...predictions],
        borderColor: '#FF9800',
        backgroundColor: '#FF9800',
        pointRadius: 4
      });
    }

    // Add Combined predictions
    if (this.hasCombinedPrediction()) {
      const combinedData = this.predictionResult.combined_prediction;
      const predictions = combinedData.predictions || [];
      const dates = combinedData.prediction_dates || [];
      
      chartData.datasets.push({
        label: 'Combined Prediction',
        data: [this.predictionResult.current_price, ...predictions],
        borderColor: '#9C27B0',
        backgroundColor: '#9C27B0',
        pointRadius: 4,
        borderWidth: 3
      });
    }

    return chartData;
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard:', text);
    });
  }

  // Chat view helper methods
  getCurrentTime(): string {
    return new Date().toLocaleTimeString();
  }

  getLSTMTrend(): string {
    if (!this.predictionResult?.lstm_prediction?.predictions) return 'Insufficient data';
    
    const predictions = this.predictionResult.lstm_prediction.predictions;
    const currentPrice = this.predictionResult.current_price;
    
    if (predictions.length === 0) return 'No predictions available';
    
    const firstPrediction = predictions[0];
    const lastPrediction = predictions[predictions.length - 1];
    
    const shortTerm = ((firstPrediction - currentPrice) / currentPrice) * 100;
    const longTerm = ((lastPrediction - currentPrice) / currentPrice) * 100;
    
    if (shortTerm > 5 && longTerm > 10) return 'Strong Bullish';
    if (shortTerm > 2 && longTerm > 5) return 'Moderately Bullish';
    if (shortTerm > -2 && longTerm > -5) return 'Slightly Bullish';
    if (shortTerm < -5 && longTerm < -10) return 'Strong Bearish';
    if (shortTerm < -2 && longTerm < -5) return 'Moderately Bearish';
    if (shortTerm < 2 && longTerm < 5) return 'Slightly Bearish';
    return 'Sideways';
  }

  getLSTMInsight(): string {
    if (!this.predictionResult?.lstm_prediction?.confidence) return 'Model confidence unavailable';
    
    const confidence = this.predictionResult.lstm_prediction.confidence;
    
    if (confidence >= 0.8) return 'High confidence in pattern recognition';
    if (confidence >= 0.6) return 'Moderate confidence with some uncertainty';
    if (confidence >= 0.4) return 'Lower confidence, consider other factors';
    return 'Low confidence, results may be unreliable';
  }

  getRegressionPattern(): string {
    if (!this.predictionResult?.regression_prediction?.predictions) return 'Insufficient data';
    
    const predictions = this.predictionResult.regression_prediction.predictions;
    const currentPrice = this.predictionResult.current_price;
    
    if (predictions.length === 0) return 'No predictions available';
    
    const firstPrediction = predictions[0];
    const lastPrediction = predictions[predictions.length - 1];
    
    const shortTerm = ((firstPrediction - currentPrice) / currentPrice) * 100;
    const longTerm = ((lastPrediction - currentPrice) / currentPrice) * 100;
    
    if (shortTerm > 5 && longTerm > 10) return 'Strong Uptrend';
    if (shortTerm > 2 && longTerm > 5) return 'Moderate Uptrend';
    if (shortTerm > -2 && longTerm > -5) return 'Weak Uptrend';
    if (shortTerm < -5 && longTerm < -10) return 'Strong Downtrend';
    if (shortTerm < -2 && longTerm < -5) return 'Moderate Downtrend';
    if (shortTerm < 2 && longTerm < 5) return 'Weak Downtrend';
    return 'No Clear Trend';
  }

  getRegressionInsight(): string {
    if (!this.predictionResult?.regression_prediction?.confidence) return 'Model confidence unavailable';
    
    const confidence = this.predictionResult.regression_prediction.confidence;
    
    if (confidence >= 0.8) return 'Strong statistical correlation detected';
    if (confidence >= 0.6) return 'Moderate statistical correlation';
    if (confidence >= 0.4) return 'Weak statistical correlation';
    return 'Minimal statistical correlation';
  }

  // Price calculation methods for chat view
  getLSTMFinalPrice(): string {
    const predictions = this.predictionResult?.lstm_prediction?.predictions;
    if (!predictions || predictions.length === 0) return 'N/A';
    
    const finalPrice = predictions[predictions.length - 1];
    return this.formatPrice(finalPrice);
  }

  getLSTMPriceChange(): string {
    const predictions = this.predictionResult?.lstm_prediction?.predictions;
    const currentPrice = this.predictionResult?.current_price;
    if (!predictions || predictions.length === 0 || !currentPrice) return 'N/A';
    
    const finalPrice = predictions[predictions.length - 1];
    const changePercent = ((finalPrice - currentPrice) / currentPrice) * 100;
    const changeAmount = finalPrice - currentPrice;
    
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${this.formatPrice(changeAmount)} (${sign}${changePercent.toFixed(2)}%)`;
  }

  getRegressionFinalPrice(): string {
    const predictions = this.predictionResult?.regression_prediction?.predictions;
    if (!predictions || predictions.length === 0) return 'N/A';
    
    const finalPrice = predictions[predictions.length - 1];
    return this.formatPrice(finalPrice);
  }

  getRegressionPriceChange(): string {
    const predictions = this.predictionResult?.regression_prediction?.predictions;
    const currentPrice = this.predictionResult?.current_price;
    if (!predictions || predictions.length === 0 || !currentPrice) return 'N/A';
    
    const finalPrice = predictions[predictions.length - 1];
    const changePercent = ((finalPrice - currentPrice) / currentPrice) * 100;
    const changeAmount = finalPrice - currentPrice;
    
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${this.formatPrice(changeAmount)} (${sign}${changePercent.toFixed(2)}%)`;
  }

  getCombinedFinalPrice(): string {
    const combinedPredictions = this.predictionResult?.combined_prediction?.predictions;
    if (!combinedPredictions || combinedPredictions.length === 0) return 'N/A';
    
    const finalPrice = combinedPredictions[combinedPredictions.length - 1];
    return this.formatPrice(finalPrice);
  }

  getCombinedPriceChange(): string {
    const predictions = this.predictionResult?.combined_prediction?.predictions;
    const currentPrice = this.predictionResult?.current_price;
    if (!predictions || predictions.length === 0 || !currentPrice) return 'N/A';
    
    const finalPrice = predictions[predictions.length - 1];
    const changePercent = ((finalPrice - currentPrice) / currentPrice) * 100;
    const changeAmount = finalPrice - currentPrice;
    
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${this.formatPrice(changeAmount)} (${sign}${changePercent.toFixed(2)}%)`;
  }

  // Helper methods for individual model selection in price summary
  getSelectedModelFinalPrice(): string {
    if (this.selectedModelType === 'lstm') {
      return this.getLSTMFinalPrice();
    } else if (this.selectedModelType === 'regression') {
      return this.getRegressionFinalPrice();
    }
    return 'N/A';
  }

  getSelectedModelPriceChange(): string {
    if (this.selectedModelType === 'lstm') {
      return this.getLSTMPriceChange();
    } else if (this.selectedModelType === 'regression') {
      return this.getRegressionPriceChange();
    }
    return 'N/A';
  }

  // Chart header helper methods that return numbers for calculations
  getSelectedModelFinalPriceNumber(): number {
    if (!this.predictionResult) return 0;
    
    if (this.selectedModelType === 'lstm' && this.predictionResult.lstm_prediction?.predictions?.length) {
      return this.predictionResult.lstm_prediction.predictions[this.predictionResult.lstm_prediction.predictions.length - 1];
    } else if (this.selectedModelType === 'regression' && this.predictionResult.regression_prediction?.predictions?.length) {
      return this.predictionResult.regression_prediction.predictions[this.predictionResult.regression_prediction.predictions.length - 1];
    } else if (this.predictionResult.combined_prediction?.predictions?.length) {
      return this.predictionResult.combined_prediction.predictions[this.predictionResult.combined_prediction.predictions.length - 1];
    }
    return this.predictionResult.current_price || 0;
  }

  getSelectedModelPriceChangeNumber(): number {
    if (!this.predictionResult) return 0;
    
    const finalPrice = this.getSelectedModelFinalPriceNumber();
    const currentPrice = this.predictionResult.current_price || 0;
    
    if (currentPrice === 0) return 0;
    return ((finalPrice - currentPrice) / currentPrice) * 100;
  }

  getCombinedSentiment(): string {
    if (!this.hasLSTMPrediction() || !this.hasRegressionPrediction()) return 'Insufficient data';
    
    const lstmConfidence = this.predictionResult?.lstm_prediction?.confidence || 0;
    const regressionConfidence = this.predictionResult?.regression_prediction?.confidence || 0;
    
    const avgConfidence = (lstmConfidence + regressionConfidence) / 2;
    
    if (avgConfidence >= 0.7) return 'Very Positive';
    if (avgConfidence >= 0.5) return 'Positive';
    if (avgConfidence >= 0.3) return 'Neutral';
    return 'Negative';
  }

  getRiskLevel(): string {
    if (!this.hasLSTMPrediction() || !this.hasRegressionPrediction()) return 'Unable to assess';
    
    const lstmConfidence = this.predictionResult?.lstm_prediction?.confidence || 0;
    const regressionConfidence = this.predictionResult?.regression_prediction?.confidence || 0;
    
    const avgConfidence = (lstmConfidence + regressionConfidence) / 2;
    
    if (avgConfidence >= 0.8) return 'Low Risk';
    if (avgConfidence >= 0.6) return 'Moderate Risk';
    if (avgConfidence >= 0.4) return 'High Risk';
    return 'Very High Risk';
  }

  getRecommendation(): string {
    if (!this.hasLSTMPrediction() || !this.hasRegressionPrediction()) return 'Hold - Insufficient data';
    
    const lstmConfidence = this.predictionResult?.lstm_prediction?.confidence || 0;
    const regressionConfidence = this.predictionResult?.regression_prediction?.confidence || 0;
    
    const avgConfidence = (lstmConfidence + regressionConfidence) / 2;
    
    if (avgConfidence >= 0.7) return 'Strong Buy';
    if (avgConfidence >= 0.5) return 'Buy';
    if (avgConfidence >= 0.3) return 'Hold';
    return 'Sell';
  }

  // Enhanced chat view helper methods
  getSelectedModelLabel(): string {
    const model = this.modelTypes.find(m => m.value === this.selectedModelType);
    return model ? model.label : 'Selected models';
  }

  shouldShowLSTM(): boolean {
    return this.selectedModelType === 'lstm' || this.selectedModelType === 'both';
  }

  shouldShowRegression(): boolean {
    return this.selectedModelType === 'regression' || this.selectedModelType === 'both';
  }

  shouldShowCombined(): boolean {
    return this.selectedModelType === 'both';
  }

  shouldShowChatGPT(): boolean {
    // ChatGPT is disabled - always return false
    return false;
  }

  getLSTMRecommendation(): string {
    const trend = this.getLSTMTrend();
    if (trend.includes('Strong Bullish')) return 'strong buying opportunities';
    if (trend.includes('Bullish')) return 'potential buying opportunities';
    if (trend.includes('Bearish')) return 'caution or potential selling';
    return 'a wait-and-see approach';
  }

  getRegressionRecommendation(): string {
    const pattern = this.getRegressionPattern();
    if (pattern.includes('Strong Uptrend')) return 'strong upward momentum';
    if (pattern.includes('Uptrend')) return 'positive statistical trends';
    if (pattern.includes('Downtrend')) return 'negative statistical trends';
    return 'sideways movement with mixed signals';
  }

  getModelAgreement(): string {
    if (!this.hasLSTMPrediction() || !this.hasRegressionPrediction()) return 'insufficient agreement';
    
    const lstmTrend = this.getLSTMTrend();
    const regressionPattern = this.getRegressionPattern();
    
    const lstmBullish = lstmTrend.includes('Bullish');
    const regressionBullish = regressionPattern.includes('Uptrend');
    
    if (lstmBullish && regressionBullish) return 'strong agreement on positive outlook';
    if (!lstmBullish && !regressionBullish) return 'strong agreement on negative outlook';
    return 'mixed agreement with conflicting signals';
  }

  getAgreementImplication(): string {
    const agreement = this.getModelAgreement();
    if (agreement.includes('strong agreement on positive')) return 'increases confidence in bullish predictions';
    if (agreement.includes('strong agreement on negative')) return 'increases confidence in bearish predictions';
    return 'suggests caution due to model disagreement';
  }

  getFormattedChatGPTAnalysis(): string {
    // ChatGPT is disabled - return disabled message
    return 'ChatGPT analysis is currently disabled. Please use LSTM, Regression, or Combined models for analysis.';
  }

  getPredictionPeriodLabel(): string {
    const days = this.predictionDays;
    if (days <= 7) {
      return 'Week';
    } else if (days <= 14) {
      return '2-Week';
    } else if (days <= 30) {
      return 'Month';
    } else if (days <= 60) {
      return '2-Month';
    } else {
      return '3-Month';
    }
  }

  getPricePredictionSummary(): string {
    if (!this.predictionResult) return 'No predictions available.';
    
    const currentPrice = this.predictionResult.current_price;
    let summary = '';
    
    // Only show LSTM predictions if LSTM is selected or both
    if (this.shouldShowLSTM() && this.hasLSTMPrediction()) {
      const lstmPredictions = this.predictionResult.lstm_prediction?.predictions || [];
      if (lstmPredictions.length > 0) {
        const nearTerm = lstmPredictions[Math.floor(lstmPredictions.length * 0.3)];
        const longTerm = lstmPredictions[lstmPredictions.length - 1];
        summary += `🧠 **LSTM Model:**\n• Near-term (${Math.floor(this.predictionDays * 0.3)} days): ${this.formatPrice(nearTerm)}\n• Long-term (${this.predictionDays} days): ${this.formatPrice(longTerm)}\n\n`;
      }
    }
    
    // Only show Regression predictions if Regression is selected or both
    if (this.shouldShowRegression() && this.hasRegressionPrediction()) {
      const regressionPredictions = this.predictionResult.regression_prediction?.predictions || [];
      if (regressionPredictions.length > 0) {
        const nearTerm = regressionPredictions[Math.floor(regressionPredictions.length * 0.3)];
        const longTerm = regressionPredictions[regressionPredictions.length - 1];
        summary += `📈 **Regression Model:**\n• Near-term (${Math.floor(this.predictionDays * 0.3)} days): ${this.formatPrice(nearTerm)}\n• Long-term (${this.predictionDays} days): ${this.formatPrice(longTerm)}\n\n`;
      }
    }
    
    return summary || 'Price predictions are being calculated...';
  }

  getFinalRecommendation(): string {
    if (!this.predictionResult) return 'Complete analysis required for final recommendation.';
    
    let finalRec = `Based on my analysis of ${this.ticker} using ${this.getSelectedModelLabel()}, here's my assessment:\n\n`;
    
    // Model-specific recommendations
    if (this.selectedModelType === 'lstm') {
      const trend = this.getLSTMTrend();
      const confidence = this.formatConfidence(this.predictionResult?.lstm_prediction?.confidence || 0);
      finalRec += `**LSTM Neural Network Recommendation:**\n`;
      finalRec += `• Trend Analysis: ${trend}\n`;
      finalRec += `• Model Confidence: ${confidence}\n`;
      finalRec += `• Analysis Period: ${this.predictionDays} days\n\n`;
      finalRec += `**Investment Insight:** ${this.getLSTMRecommendation()}`;
    } else if (this.selectedModelType === 'regression') {
      const pattern = this.getRegressionPattern();
      const confidence = this.formatConfidence(this.predictionResult?.regression_prediction?.confidence || 0);
      finalRec += `**Linear Regression Recommendation:**\n`;
      finalRec += `• Statistical Pattern: ${pattern}\n`;
      finalRec += `• Model Confidence: ${confidence}\n`;
      finalRec += `• Analysis Period: ${this.predictionDays} days\n\n`;
      finalRec += `**Investment Insight:** ${this.getRegressionRecommendation()}`;
    } else if (this.selectedModelType === 'both') {
      const recommendation = this.getRecommendation();
      const sentiment = this.getCombinedSentiment();
      const risk = this.getRiskLevel();
      
      finalRec += `**Combined Models Recommendation: ${recommendation}**\n\n`;
      finalRec += `This recommendation is based on:\n`;
      finalRec += `• Overall sentiment: ${sentiment}\n`;
      finalRec += `• Risk assessment: ${risk}\n`;
      finalRec += `• Analysis period: ${this.predictionDays} days\n`;
      finalRec += `• Model agreement: ${this.getModelAgreement()}\n\n`;
      
      // Add specific reasoning based on recommendation
      if (recommendation.includes('Buy')) {
        finalRec += `**Investment Insight:** The models show positive indicators suggesting potential upward price movement. Consider this as a potential entry point, but always verify with current market conditions.`;
      } else if (recommendation.includes('Sell')) {
        finalRec += `**Investment Insight:** The analysis indicates potential downward pressure on the stock price. Consider reviewing your position and risk tolerance.`;
      } else {
        finalRec += `**Investment Insight:** The analysis shows mixed signals or neutral indicators. This might be a good time to wait for clearer market direction before making significant moves.`;
      }
    }
    
    return finalRec;
  }
}
