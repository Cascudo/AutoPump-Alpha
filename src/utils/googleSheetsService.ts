// src/utils/googleSheetsService.ts
export interface RewardBurnEntry {
  creatorRewards: number;
  date: string;             // Column B - Date
  time: string;             // Column C - Time  
  holderPrize: number;      // Column D - Holder Prize
  burn: number;             // Column E - Burn
  rev: number;              // Column F - Rev
  winningWallet: string;    // Column G - Winning Wallet
  prizeTx: string;          // Column H - Prize Tx
  burnAmount: number;       // Column I - Burn Amount
  fullDateTime: string;     // Combined date + time for sorting
}

export interface StatsData {
  totalCreatorRewards: number;
  totalHolderPrizes: number;
  totalTokensBurned: number;
  totalRevenue: number;
  totalEvents: number;
  totalMembers: number; // Estimated from unique wallets
  totalRewardsDistributed: number; // USD value for display
  latestReward: {
    wallet: string;
    amount: number;
    date: string;
    prizeTx: string;
    winnerAddress: string; // Full address for verification
  } | null;
  latestBurn: {
    tokensBurned: number;
    date: string;
    burnTx: string;
  } | null;
  recentWinners: Array<{
    wallet: string;
    amount: number;
    date: string;
    prizeTx: string;
  }>;
  recentBurns: Array<{
    amount: number;
    date: string;
    burnTx: string;
  }>;
  lastUpdated: number;
}

class GoogleSheetsService {
  private readonly SHEET_ID: string;
  private readonly API_KEY: string;
  private cache: { data: StatsData | null; timestamp: number } = { data: null, timestamp: 0 };
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  
  constructor() {
    this.SHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '';
    this.API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY || '';
    
    if (!this.SHEET_ID || !this.API_KEY) {
      console.warn('⚠️ Google Sheets credentials not configured. Using fallback data.');
    } else {
      console.log('✅ Google Sheets service initialized with credentials');
    }
  }

  private async fetchSheetData(range: string): Promise<any[][]> {
    if (!this.SHEET_ID || !this.API_KEY) {
      console.warn('🚫 Google Sheets credentials missing');
      return [];
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${range}?key=${this.API_KEY}`;
      
      console.log('📡 Fetching data from Google Sheets...');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('API key invalid or quota exceeded');
        } else if (response.status === 404) {
          throw new Error('Spreadsheet not found or not public');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      const rows = data.values || [];
      
      console.log(`✅ Successfully fetched ${rows.length} rows from Google Sheets`);
      return rows;
      
    } catch (error) {
      console.error('🚨 Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  async getRewardsBurnsData(): Promise<RewardBurnEntry[]> {
    try {
      // Fetch data from row 2 onwards (row 1 has headers)
      // Your columns: A=Creator Rewards, B=Date, C=Time, D=Holder Prize, E=Burn, F=Rev, G=Winning Wallet, H=Prize Tx, I=Burn Amount
      const data = await this.fetchSheetData('Sheet1!A2:I1000');
      
      const entries = data.map((row, index) => {
        try {
          const creatorRewards = this.parseNumber(row[0]) || 0;
          const date = row[1] || '';
          const time = row[2] || '';
          const holderPrize = this.parseNumber(row[3]) || 0;
          const burn = this.parseNumber(row[4]) || 0;
          const rev = this.parseNumber(row[5]) || 0;
          const winningWallet = row[6] || '';
          const prizeTx = row[7] || '';
          const burnAmount = this.parseNumber(row[8]) || 0;

          // Combine date and time for proper sorting
          const fullDateTime = this.combineDateTime(date, time);

          const entry: RewardBurnEntry = {
            creatorRewards,
            date,
            time,
            holderPrize,
            burn,
            rev,
            winningWallet: winningWallet.replace('!', ''), // Remove the exclamation mark if present
            prizeTx,
            burnAmount,
            fullDateTime
          };
          
          return entry;
        } catch (error) {
          console.warn(`⚠️ Error parsing row ${index + 2}:`, error, row);
          return null;
        }
      }).filter((entry): entry is RewardBurnEntry => {
        // Filter out invalid entries
        return entry !== null && 
               entry.date && 
               (entry.creatorRewards > 0 || entry.holderPrize > 0 || entry.burnAmount > 0);
      });

      console.log(`📊 Processed ${entries.length} valid entries from spreadsheet`);
      return entries;
      
    } catch (error) {
      console.error('💥 Error parsing rewards/burns data:', error);
      return [];
    }
  }

  async getStatsData(forceRefresh: boolean = false): Promise<StatsData> {
    try {
      // Check cache first unless forcing refresh
      if (!forceRefresh && this.cache.data && (Date.now() - this.cache.timestamp) < this.CACHE_DURATION) {
        console.log('📋 Using cached data');
        return this.cache.data;
      }

      console.log('🔄 Refreshing stats data from your spreadsheet...');
      const entries = await this.getRewardsBurnsData();

      if (entries.length === 0) {
        console.warn('⚠️ No data received from spreadsheet, using fallback');
        return this.getFallbackData();
      }

      // Sort by full date/time (most recent first)
      const sortedEntries = entries.sort((a, b) => {
        const dateA = new Date(a.fullDateTime).getTime();
        const dateB = new Date(b.fullDateTime).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      // Calculate totals
      const totalCreatorRewards = entries.reduce((sum, entry) => sum + entry.creatorRewards, 0);
      const totalHolderPrizes = entries.reduce((sum, entry) => sum + entry.holderPrize, 0);
      const totalTokensBurned = entries.reduce((sum, entry) => sum + entry.burnAmount, 0);
      const totalRevenue = entries.reduce((sum, entry) => sum + entry.rev, 0);

      // Get unique winners for member count estimation
      const uniqueWallets = new Set(entries.filter(e => e.winningWallet && e.winningWallet.length > 10).map(e => e.winningWallet));
      const totalMembers = Math.max(uniqueWallets.size * 12, 1000); // Estimate total members as 12x winners

      // Get latest winner and burn (only entries with actual data)
      const entriesWithWinners = sortedEntries.filter(entry => 
        entry.winningWallet && 
        entry.winningWallet.length > 10 && 
        entry.holderPrize > 0
      );
      
      const entriesWithBurns = sortedEntries.filter(entry => entry.burnAmount > 0);

      const latestReward = entriesWithWinners.length > 0 ? {
        wallet: this.formatWalletAddress(entriesWithWinners[0].winningWallet),
        amount: entriesWithWinners[0].holderPrize,
        date: entriesWithWinners[0].fullDateTime,
        prizeTx: entriesWithWinners[0].prizeTx,
        winnerAddress: entriesWithWinners[0].winningWallet
      } : null;

      const latestBurn = entriesWithBurns.length > 0 ? {
        tokensBurned: entriesWithBurns[0].burnAmount,
        date: entriesWithBurns[0].fullDateTime,
        burnTx: '' // You don't have burn tx in your current format
      } : null;

      // Get recent winners (last 10)
      const recentWinners = entriesWithWinners.slice(0, 10).map(entry => ({
        wallet: this.formatWalletAddress(entry.winningWallet),
        amount: entry.holderPrize,
        date: entry.fullDateTime,
        prizeTx: entry.prizeTx
      }));

      // Get recent burns (last 5)
      const recentBurns = entriesWithBurns.slice(0, 5).map(entry => ({
        amount: entry.burnAmount,
        date: entry.fullDateTime,
        burnTx: '' // No burn tx in your current format
      }));

      const statsData: StatsData = {
        totalCreatorRewards,
        totalHolderPrizes,
        totalTokensBurned,
        totalRevenue,
        totalEvents: entries.length,
        totalMembers,
        totalRewardsDistributed: totalHolderPrizes, // USD value same as holder prizes
        latestReward,
        latestBurn,
        recentWinners,
        recentBurns,
        lastUpdated: Date.now()
      };

      // Update cache
      this.cache = {
        data: statsData,
        timestamp: Date.now()
      };

      console.log('✨ Live stats data loaded from your spreadsheet:', {
        totalEvents: statsData.totalEvents,
        totalRewards: statsData.totalHolderPrizes.toFixed(4),
        totalBurned: statsData.totalTokensBurned.toLocaleString(),
        latestWinner: latestReward?.wallet || 'None'
      });
      
      return statsData;

    } catch (error) {
      console.error('💥 Error getting stats data:', error);
      
      // Return cached data if available, otherwise fallback
      if (this.cache.data) {
        console.log('📋 Returning cached data due to error');
        return this.cache.data;
      }
      
      return this.getFallbackData();
    }
  }

  private combineDateTime(date: string, time: string): string {
    try {
      if (!date) return new Date().toISOString();
      
      // Handle your date format: "25/05/2025"
      const [day, month, year] = date.split('/');
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Handle your time format: "23:00"
      const formattedTime = time || '00:00';
      
      const combinedDateTime = `${formattedDate}T${formattedTime}:00.000Z`;
      return combinedDateTime;
    } catch (error) {
      console.warn('⚠️ Error combining date/time:', error, { date, time });
      return new Date().toISOString();
    }
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove commas and parse
      const cleaned = value.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private formatWalletAddress(address: string): string {
    if (!address || address.length < 8) return address;
    // Format wallet address as "8BEt...qxKt" 
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  }

  private getTimeAgo(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Less than 1h ago';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  }

  // Public method to get formatted latest info for display
  async getLatestInfoFormatted(): Promise<{
    latestReward: string;
    latestBurn: string;
  }> {
    try {
      const stats = await this.getStatsData();
      
      const latestReward = stats.latestReward 
        ? `$${stats.latestReward.amount.toFixed(4)} to ${stats.latestReward.wallet} (${this.getTimeAgo(stats.latestReward.date)})`
        : 'No recent rewards';

      const latestBurn = stats.latestBurn
        ? `${stats.latestBurn.tokensBurned.toLocaleString()} tokens burned (${this.getTimeAgo(stats.latestBurn.date)})`
        : 'No recent burns';

      return { latestReward, latestBurn };
    } catch (error) {
      console.error('💥 Error getting formatted info:', error);
      return {
        latestReward: 'Unable to fetch latest reward',
        latestBurn: 'Unable to fetch latest burn'
      };
    }
  }

  // Force refresh cache
  async forceRefresh(): Promise<StatsData> {
    console.log('🔄 Force refreshing data from spreadsheet...');
    return this.getStatsData(true);
  }

  // Get cache status
  getCacheStatus(): { isCached: boolean; age: number; expiresIn: number } {
    const age = Date.now() - this.cache.timestamp;
    const expiresIn = Math.max(0, this.CACHE_DURATION - age);
    
    return {
      isCached: this.cache.data !== null && age < this.CACHE_DURATION,
      age: Math.floor(age / 1000), // in seconds
      expiresIn: Math.floor(expiresIn / 1000) // in seconds
    };
  }

  private getFallbackData(): StatsData {
    console.log('📋 Using fallback data for development/testing');
    return {
      totalCreatorRewards: 0.5836, // Based on your sample data
      totalHolderPrizes: 0.2334, // Sum of holder prizes from your data
      totalTokensBurned: 1681812, // Sum of burn amounts from your data
      totalRevenue: 0.1755, // Sum of rev from your data
      totalEvents: 3, // Number of events in your sample
      totalMembers: 36, // Estimated from unique wallets * 12
      totalRewardsDistributed: 0.2334,
      latestReward: {
        wallet: 'ByYq...X6EB',
        amount: 0.0468,
        date: '2025-05-27T23:00:00.000Z',
        prizeTx: 'https://solscan.io/tx/2BwPHTNvUPUSSHYfvBDS3v74EcCqTFU6eM2bKxQD3NygX19whwWmPvnKgv9DSwnuEsM2oPTibxt6jVMpPC9b2Yq',
        winnerAddress: 'ByYqV4Sn6yovrHMyJFs7ngSkbVYXQAdHyT2S9f2gX6EB'
      },
      latestBurn: {
        tokensBurned: 252029,
        date: '2025-05-27T23:00:00.000Z',
        burnTx: ''
      },
      recentWinners: [
        {
          wallet: 'ByYq...X6EB',
          amount: 0.0468,
          date: '2025-05-27T23:00:00.000Z',
          prizeTx: 'https://solscan.io/tx/2BwPHTNvUPUSSHYfvBDS3v74EcCqTFU6eM2bKxQD3NygX19whwWmPvnKgv9DSwnuEsM2oPTibxt6jVMpPC9b2Yq'
        },
        {
          wallet: 'D3oB...Y9nn',
          amount: 0.1344,
          date: '2025-05-26T23:00:00.000Z',
          prizeTx: ''
        },
        {
          wallet: '8BEt...qxKt',
          amount: 0.05224,
          date: '2025-05-25T23:00:00.000Z',
          prizeTx: 'https://solscan.io/tx/ePaGG35jH91ugWYTfuaYLD3LPPzoW71RSAv24oLfECNjHocvMyDDL94ChfHyLfKdudBiwX2TRroDxGKpBrTwt1f'
        }
      ],
      recentBurns: [
        {
          amount: 252029,
          date: '2025-05-27T23:00:00.000Z',
          burnTx: ''
        },
        {
          amount: 556927,
          date: '2025-05-26T23:00:00.000Z',
          burnTx: ''
        },
        {
          amount: 872856,
          date: '2025-05-25T23:00:00.000Z',
          burnTx: ''
        }
      ],
      lastUpdated: Date.now()
    };
  }
}

export const googleSheetsService = new GoogleSheetsService();