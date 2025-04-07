import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css']
})
export class HomepageComponent implements OnInit, AfterViewInit {
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  // Variables
  usdJpyRate: number | null = null;
  jpyUsdRate: number | null = null;
  usdJpyValue: number | null = null;
  jpyUsdValue: number | null = null;
  usdJpyChange: string | null = null;
  jpyUsdChange: string | null = null;
  usdJpyChangeClass: string = '';
  jpyUsdChangeClass: string = '';
  lastUpdated: string | null = null;
  footerUpdated: string | null = null;
  marketStatus: string | null = null;
  usdJpyHigh: number | null = null;
  usdJpyLow: number | null = null;
  usdJpyOpen: number | null = null;  // New: Opening price
  usdJpyClose: number | null = null; // New: Closing price
  previousUsdJpyRate: number | null = null; // To calculate real change
  currentPeriod: string = '1D';
  timePeriods: string[] = ['1D', '1W', '1M', '3M', '1Y'];
  chart: Chart | null = null;
  chartLoaded: boolean = false;
  historicalData: any[] = [];

  private readonly API_BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
  private readonly FALLBACK_API_URL = 'https://latest.currency-api.pages.dev/v1';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.initializeApp();
  }

  ngAfterViewInit(): void {
    this.initializeChart();
  }

  async initializeApp(): Promise<void> {
    try {
      await this.fetchLatestRates();
      await this.fetchHistoricalData();
      setInterval(() => this.fetchLatestRates(), 60000); // Update every minute
    } catch (error) {
      console.error('Error initializing app:', error);
      this.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  async fetchLatestRates(): Promise<void> {
    try {
      const response = await this.http.get<any>(`${this.API_BASE_URL}/currencies/usd.json`).toPromise();
      console.log('Primary API Response:', response);
      this.processApiData(response);
    } catch (primaryError) {
      console.error('Primary API error:', primaryError);
      try {
        const fallbackResponse = await this.http.get<any>(`${this.FALLBACK_API_URL}/currencies/usd.json`).toPromise();
        console.log('Fallback API Response:', fallbackResponse);
        this.processApiData(fallbackResponse);
      } catch (fallbackError) {
        console.error('Fallback API error:', fallbackError);
        this.showError('Failed to fetch latest rates');
      }
    }
  }

  processApiData(data: any): void {
    const usdJpy = data.usd.jpy;

    // Store previous rate for change calculation
    if (this.usdJpyRate !== null) {
      this.previousUsdJpyRate = this.usdJpyRate;
    }
    this.usdJpyRate = usdJpy;
    this.jpyUsdRate = 1 / usdJpy;
    this.usdJpyValue = usdJpy;
    this.jpyUsdValue = this.jpyUsdRate;

    // Calculate real change if previous rate exists
    if (this.previousUsdJpyRate !== null) {
      const change = usdJpy - this.previousUsdJpyRate;
      this.usdJpyChange = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
      this.jpyUsdChange = (-change / usdJpy).toFixed(4); // Approximate inverse change
      this.usdJpyChangeClass = change >= 0 ? 'up' : 'down';
      this.jpyUsdChangeClass = change >= 0 ? 'down' : 'up';
    } else {
      this.usdJpyChange = '0.00'; // Initial value
      this.jpyUsdChange = '0.0000';
      this.usdJpyChangeClass = '';
      this.jpyUsdChangeClass = '';
    }

    const now = new Date().toLocaleString();
    this.lastUpdated = now;
    this.footerUpdated = now;
    this.marketStatus = 'Open'; // Simplified
    this.usdJpyHigh = usdJpy + 0.5; // Placeholder (replace with real data if available)
    this.usdJpyLow = usdJpy - 0.5;  // Placeholder
    this.usdJpyOpen = this.usdJpyOpen || usdJpy; // Set opening price on first fetch
    this.usdJpyClose = usdJpy; // Update closing price with latest rate

    console.log('Processed Data:', { usdJpyRate: this.usdJpyRate, usdJpyChange: this.usdJpyChange });
  }

  async fetchHistoricalData(period: string = this.currentPeriod): Promise<void> {
    // Simulate historical data based on period (since no real historical API is provided)
    const baseRate = this.usdJpyRate || 150; // Use current rate as base if available
    this.historicalData = this.generateHistoricalData(baseRate, period);
    this.chartLoaded = true;
    console.log(`Historical Data for ${period}:`, this.historicalData);
    this.updateChart(); // Update chart with new data
  }

  // Generate dummy historical data based on period
  generateHistoricalData(baseRate: number, period: string): any[] {
    const data = [];
    const now = new Date();
    let days: number;

    switch (period) {
      case '1D': days = 1; break;
      case '1W': days = 7; break;
      case '1M': days = 30; break;
      case '3M': days = 90; break;
      case '1Y': days = 365; break;
      default: days = 1;
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const value = baseRate + (Math.random() - 0.5) * 2; // Random fluctuation ±1
      data.push({ date: date.toLocaleDateString(), value: value.toFixed(2) });
    }
    return data;
  }

  initializeChart(): void {
    if (this.chartContainer && this.chartContainer.nativeElement) {
      this.chart = new Chart(this.chartContainer.nativeElement, {
        type: 'line',
        data: {
          labels: this.historicalData.map(d => d.date),
          datasets: [{
            label: 'USD/JPY',
            data: this.historicalData.map(d => d.value),
            borderColor: 'blue',
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      console.log('Chart Initialized');
    } else {
      console.error('Chart container not found');
    }
  }

  changePeriod(period: string): void {
    this.currentPeriod = period;
    this.fetchHistoricalData(period); // Fetch new data for the selected period
  }

  updateChart(): void {
    if (this.chart) {
      this.chart.data.labels = this.historicalData.map(d => d.date);
      this.chart.data.datasets[0].data = this.historicalData.map(d => d.value);
      this.chart.update();
      console.log(`Chart Updated for ${this.currentPeriod}`);
    }
  }

  showError(message: string): void {
    console.log('Error:', message);
  }
}
