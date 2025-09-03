import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, LineController } from 'chart.js';

@Component({
  selector: 'price-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container" *ngIf="chartData">
      <div class="chart-loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading chart data...</p>
      </div>
      <div class="no-chart-data" *ngIf="!loading && !hasAnyChartData()">
        <p>No chart data available for this date</p>
      </div>
      
      <div class="chart-wrapper" *ngIf="!loading && hasAnyChartData()">
        <canvas #chartCanvas width="400" height="300"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
      height: 300px;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
    }
    
    .chart-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6c757d;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .no-chart-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6c757d;
      font-style: italic;
    }
    
    .chart-wrapper {
      width: 100%;
      height: 100%;
    }
  `]
})
export class PriceChartComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() chartData: any = null;
  @Input() loading: boolean = false;
  
  private chart: Chart | null = null;

  constructor() {
    // Register Chart.js components for line charts
    Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, LineController);
  }

  ngOnInit() {
    // This method is called after the component's view has been fully initialized.
    // It's a good place to create the chart if it depends on the view.
    // For now, it's empty as the chart creation is handled by ngOnChanges.
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('ngOnChanges called with changes:', changes);
    
    if (changes['chartData'] && this.chartData && !this.loading) {
      console.log('Chart data changed, creating chart...');
      console.log('Chart data:', this.chartData);
      // Use setTimeout to ensure the view is ready
      setTimeout(() => {
        this.createChart();
      }, 0);
    }
    
    if (changes['loading'] && !this.loading && this.chartData) {
      console.log('Loading finished, creating chart...');
      // Use setTimeout to ensure the view is ready
      setTimeout(() => {
        this.createChart();
      }, 0);
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  ngAfterViewInit() {
    // This method is called after the view has been fully initialized.
    // If we already have chart data, create the chart now
    if (this.chartData && !this.loading) {
      console.log('ngAfterViewInit: Creating chart with existing data');
      // Use setTimeout to ensure the view is fully rendered
      setTimeout(() => {
        this.createChart();
      }, 0);
    }
  }

  private createChart() {
    console.log('createChart called');
    console.log('chartCanvas:', this.chartCanvas);
    console.log('chartData:', this.chartData);
    
    if (!this.chartCanvas || !this.chartData) {
      console.log('Early return: no canvas or chart data');
      return;
    }

    // Destroy existing chart
    if (this.chart) {
      console.log('Destroying existing chart');
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.log('No canvas context');
      return;
    }

    // Get all chart points including after-hours data
    const allPoints = this.getAllChartPoints();
    console.log('All chart points:', allPoints);
    
    // If no intraday points, create a simple OHLC chart
    if (allPoints.length === 0) {
      console.log('No intraday points, creating OHLC chart');
      this.createSimpleOHLCChart(ctx);
      return;
    }

    console.log('Creating full chart with', allPoints.length, 'points');

    // Prepare chart data
    const labels = allPoints.map(point => point.time);
    const prices = allPoints.map(point => point.price);
    
    // Create datasets for different types of data
    const marketHoursData: number[] = [];
    const afterHoursData: number[] = [];
    const preMarketData: number[] = [];
    
    allPoints.forEach(point => {
      if (point.isPreMarket) {
        marketHoursData.push(NaN);
        afterHoursData.push(NaN);
        preMarketData.push(point.price);
      } else if (point.isAfterHours) {
        marketHoursData.push(NaN);
        afterHoursData.push(point.price);
        preMarketData.push(NaN);
      } else {
        marketHoursData.push(point.price);
        afterHoursData.push(NaN);
        preMarketData.push(NaN);
      }
    });

    const chartData: ChartData<'line'> = {
      labels: labels,
      datasets: [
        {
          label: 'Market Hours',
          data: marketHoursData,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#007bff',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: false,
          tension: 0.1
        },
        {
          label: 'After Hours',
          data: afterHoursData,
          borderColor: '#ffc107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#ffc107',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: false,
          tension: 0.1
        },
        {
          label: 'Pre-Market',
          data: preMarketData,
          borderColor: '#6c757d',
          backgroundColor: 'rgba(108, 117, 125, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#6c757d',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: false,
          tension: 0.1
        }
      ]
    };

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Price Chart (6 AM - 5 PM)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                const point = allPoints[context.dataIndex];
                let label = `${context.dataset.label}: $${point.price.toFixed(2)}`;
                if (point.isPreMarket) {
                  label += ' (Pre-Market)';
                } else if (point.isAfterHours) {
                  label += ' (After Hours)';
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Price ($)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Time'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        animation: {
          duration: 1000
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private getAllChartPoints(): any[] {
    console.log('getAllChartPoints called');
    console.log('chartData:', this.chartData);
    
    if (!this.chartData) {
      console.log('No chart data, returning empty array');
      return [];
    }
    
    console.log('Intraday points:', this.chartData.intradayPoints);
    console.log('After-hours points:', this.chartData.afterHoursPoints);
    
    let allPoints = [...(this.chartData.intradayPoints || [])];
    
    // Include after-hours data
    if (this.chartData.afterHoursPoints && this.chartData.afterHoursPoints.length > 0) {
      allPoints = [...allPoints, ...this.chartData.afterHoursPoints];
    }
    
    // Sort points by time to ensure proper order
    allPoints.sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
    
    console.log('Total chart points:', allPoints.length);
    console.log('All points:', allPoints);
    return allPoints;
  }

  private createSimpleOHLCChart(ctx: CanvasRenderingContext2D) {
    // Create a simple OHLC chart when no intraday data is available
    const chartData: ChartData<'line'> = {
      labels: ['Open', 'High', 'Low', 'Close'],
      datasets: [
        {
          label: 'Price',
          data: [
            parseFloat(this.chartData.open) || 0,
            parseFloat(this.chartData.high) || 0,
            parseFloat(this.chartData.low) || 0,
            parseFloat(this.chartData.close) || 0
          ],
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointBackgroundColor: '#007bff',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: false,
          tension: 0.1
        }
      ]
    };

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'OHLC Price Summary',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Price ($)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Price Type'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        animation: {
          duration: 1000
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  hasAnyChartData(): boolean {
    if (!this.chartData) return false;
    
    // Check if we have any chart points or at least OHLC data
    const hasIntradayData = this.chartData.intradayPoints && this.chartData.intradayPoints.length > 0;
    const hasAfterHoursData = this.chartData.afterHoursPoints && this.chartData.afterHoursPoints.length > 0;
    const hasOHLCData = this.chartData.open && this.chartData.close && this.chartData.high && this.chartData.low;
    
    return hasIntradayData || hasAfterHoursData || hasOHLCData;
  }
}
