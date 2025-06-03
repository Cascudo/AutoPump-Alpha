// src/utils/googleSheetsService.ts
// ——————————————————————————————————————————————————————————————
// Unified Google Sheets service: read, write, stats & utilities
// ——————————————————————————————————————————————————————————————

/* ────────────────
   Interfaces
   ──────────────── */
export interface ManualRewardEntry {
  creatorRewards: number;   // Amount of creator rewards received
  holderPrize: number;      // Amount sent to winner
  burn: number;             // Amount allocated for burns
  rev: number;              // Amount for operations
  winningWallet: string;    // Winner's wallet address
  prizeTx: string;          // Prize transaction link
  burnAmount?: number;      // Token burn amount (optional)
  burnTx?: string;          // Burn transaction link (optional)
}

export interface RewardBurnEntry {
  creatorRewards: number;   // Column A – Creator Rewards
  date: string;             // Column B – Date
  time: string;             // Column C – Time
  holderPrize: number;      // Column D – Holder Prize
  burn: number;             // Column E – Burn
  rev: number;              // Column F – Rev
  winningWallet: string;    // Column G – Winning Wallet
  prizeTx: string;          // Column H – Prize Tx
  burnAmount: number;       // Column I – Burn Amount
  burnTx: string;           // Column J – Burn Tx ← ADDED THIS!
  fullDateTime: string;     // Derived ISO string for sorting
}

export interface StatsData {
  totalCreatorRewards: number;
  totalHolderPrizes: number;
  totalTokensBurned: number;
  totalRevenue: number;
  totalEvents: number;
  totalMembers: number;
  totalRewardsDistributed: number;
  latestReward: {
    wallet: string;
    amount: number;
    date: string;
    prizeTx: string;
    winnerAddress: string;
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

/* ────────────────
   Service class
   ──────────────── */
class GoogleSheetsService {
  /* ▸ Config & cache */
  private readonly SHEET_ID: string;
  private readonly API_KEY: string;
  private cache: { data: StatsData | null; timestamp: number } = {
    data: null,
    timestamp: 0
  };
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.SHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '';
    this.API_KEY  = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY || '';

    if (!this.SHEET_ID || !this.API_KEY) {
      console.warn('⚠️ Google Sheets credentials not configured. Using fallback data.');
    } else {
      console.log('✅ Google Sheets service initialized with credentials');
    }
  }

  /* ▸ Low-level fetch */
  private async fetchSheetData(range: string): Promise<any[][]> {
    if (!this.SHEET_ID || !this.API_KEY) {
      console.warn('🚫 Google Sheets credentials missing');
      return [];
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${range}?key=${this.API_KEY}`;
      console.log('📡 Fetching data from Google Sheets...');
      const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });

      if (!response.ok) {
        if (response.status === 403)      throw new Error('API key invalid or quota exceeded');
        else if (response.status === 404) throw new Error('Spreadsheet not found or not public');
        else                              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values || [];
      console.log(`✅ Successfully fetched ${rows.length} rows`);
      return rows;

    } catch (error) {
      console.error('🚨 Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  /* ─────────────────────────────────────────────────────────────
     WRITE  ✏️  —  append a manual reward distribution row
     ───────────────────────────────────────────────────────────── */
  /**
   * Append a new reward entry to the Google Sheet.
   * Returns true on success, false on failure.
   */
  async appendRewardEntry(entry: ManualRewardEntry): Promise<boolean> {
    try {
      if (!this.SHEET_ID || !this.API_KEY) {
        console.error('🚫 Google Sheets credentials missing for writing');
        return false;
      }

      // Current date/time in DD/MM/YYYY + 24 h time
      const now  = new Date();
      const date = now.toLocaleDateString('en-GB');
      const time = now.toLocaleTimeString('en-GB', { hour12: false });

      // Row mapping: A-J
      const rowData = [
        entry.creatorRewards,
        date,
        time,
        entry.holderPrize,
        entry.burn,
        entry.rev,
        entry.winningWallet,
        entry.prizeTx,
        entry.burnAmount ?? 0,
        entry.burnTx ?? ''
      ];

      console.log('📝 Appending reward entry:', {
        date,
        time,
        winner: this.formatWalletAddress(entry.winningWallet),
        amount: entry.holderPrize
      });

      const appendUrl =
        `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Sheet1!A:J:append` +
        `?valueInputOption=USER_ENTERED&key=${this.API_KEY}`;

      const response = await fetch(appendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [rowData] })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      await response.json();
      console.log('✅ Successfully appended reward entry');
      // Invalidate cache so next read is fresh
      this.cache = { data: null, timestamp: 0 };
      return true;

    } catch (error) {
      console.error('💥 Error appending to Google Sheets:', error);
      return false;
    }
  }

  /**
   * Validate manual reward entry form data.
   */
  validateRewardEntry(entry: Partial<ManualRewardEntry>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.creatorRewards || entry.creatorRewards <= 0)
      errors.push('Creator rewards amount must be greater than 0');

    if (!entry.holderPrize || entry.holderPrize <= 0)
      errors.push('Holder prize must be greater than 0');

    if (entry.burn === undefined || entry.burn < 0)
      errors.push('Burn amount must be ≥ 0');

    if (entry.rev === undefined || entry.rev < 0)
      errors.push('Revenue amount must be ≥ 0');

    if (!entry.winningWallet || entry.winningWallet.length < 32)
      errors.push('Valid winning wallet address is required');

    // Distribution check (allowing tiny rounding differences)
    const total = (entry.holderPrize ?? 0) + (entry.burn ?? 0) + (entry.rev ?? 0);
    const diff  = Math.abs(total - (entry.creatorRewards ?? 0));
    if (diff > 0.0001)
      errors.push(`Distribution doesn't match creator rewards. Total: ${total.toFixed(4)}, Creator: ${(entry.creatorRewards ?? 0).toFixed(4)}`);

    return { valid: errors.length === 0, errors };
  }

  /**
   * Suggest holder/burn/rev amounts for a given creator-rewards value.
   */
  calculateSuggestedDistribution(creatorRewards: number): Omit<ManualRewardEntry, 'winningWallet' | 'prizeTx'> {
    const REWARD = 0.4, BURN = 0.3, OPS = 0.3;
    return {
      creatorRewards,
      holderPrize: creatorRewards * REWARD,
      burn:        creatorRewards * BURN,
      rev:         creatorRewards * OPS,
      burnAmount: 0
    };
  }

  /**
   * Get the next available row number (helper for future batch ops).
   */
  async getLastRowNumber(): Promise<number> {
    try {
      const data = await this.fetchSheetData('Sheet1!A:A');
      return data.length + 1;
    } catch {
      console.warn('Could not determine last row, defaulting to append mode');
      return -1;
    }
  }

  /* ─────────────────────────────────────────────────────────────
     READ  📖  —  transform rows → domain objects
     ───────────────────────────────────────────────────────────── */
  async getRewardsBurnsData(): Promise<RewardBurnEntry[]> {
    try {
      // ✅ FIXED: Now reading A-J instead of A-I
      const rows = await this.fetchSheetData('Sheet1!A2:J1000');

      const entries = rows
        .map((row, idx) => {
          try {
            const creatorRewards = this.parseNumber(row[0]);
            const date           = row[1] || '';
            const time           = row[2] || '';
            const holderPrize    = this.parseNumber(row[3]);
            const burn           = this.parseNumber(row[4]);
            const rev            = this.parseNumber(row[5]);
            const winningWallet  = (row[6] || '').replace('!', '');
            const prizeTx        = row[7] || '';
            const burnAmount     = this.parseNumber(row[8]);
            const burnTx         = row[9] || ''; // ✅ FIXED: Now reading Column J
            const fullDateTime   = this.combineDateTime(date, time);

            return <RewardBurnEntry>{
              creatorRewards,
              date,
              time,
              holderPrize,
              burn,
              rev,
              winningWallet,
              prizeTx,
              burnAmount,
              burnTx, // ✅ FIXED: Now includes burn TX
              fullDateTime
            };
          } catch (err) {
            console.warn(`⚠️ Error parsing row ${idx + 2}:`, err, row);
            return null;
          }
        })
        .filter((e): e is RewardBurnEntry =>
          !!e && e.date && (e.creatorRewards > 0 || e.holderPrize > 0 || e.burnAmount > 0)
        );

      console.log(`📊 Parsed ${entries.length} valid entries`);
      
      // ✅ DEBUG: Add this to see what burn data you're getting
      const burnsWithTx = entries.filter(e => e.burnAmount > 0);
      console.log(`🔥 Found ${burnsWithTx.length} burns:`, burnsWithTx.map(b => ({
        amount: b.burnAmount,
        hasTx: !!b.burnTx,
        tx: b.burnTx
      })));
      
      return entries;

    } catch (error) {
      console.error('💥 Error parsing rewards/burns data:', error);
      return [];
    }
  }

  /* ─────────────────────────────────────────────────────────────
     STATS  📈  —  summarise spreadsheet into dashboard data
     ───────────────────────────────────────────────────────────── */
  async getStatsData(forceRefresh = false): Promise<StatsData> {
    try {
      // Serve cached if fresh
      if (!forceRefresh && this.cache.data && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
        console.log('📋 Serving cached stats');
        return this.cache.data;
      }

      console.log('🔄 Refreshing stats from sheet…');
      const entries = await this.getRewardsBurnsData();
      if (entries.length === 0) {
        console.warn('⚠️ Sheet empty; using fallback');
        return this.getFallbackData();
      }

      // Latest first
      entries.sort((a, b) => new Date(b.fullDateTime).getTime() - new Date(a.fullDateTime).getTime());

      // Totals
      const totals = entries.reduce(
        (acc, e) => {
          acc.rewards += e.creatorRewards;
          acc.holder  += e.holderPrize;
          acc.burned  += e.burnAmount;
          acc.rev     += e.rev;
          return acc;
        },
        { rewards: 0, holder: 0, burned: 0, rev: 0 }
      );

      // Unique wallet estimate
      const unique = new Set(entries.filter(e => e.winningWallet.length > 10).map(e => e.winningWallet));
      const totalMembers = Math.max(unique.size * 12, 1000);

      /* Latest reward & burn */
      const latestRewardEntry = entries.find(e => e.winningWallet && e.holderPrize > 0) || null;
      const latestBurnEntry   = entries.find(e => e.burnAmount > 0) || null;

      const stats: StatsData = {
        totalCreatorRewards: totals.rewards,
        totalHolderPrizes:   totals.holder,
        totalTokensBurned:   totals.burned,
        totalRevenue:        totals.rev,
        totalEvents:         entries.length,
        totalMembers,
        totalRewardsDistributed: totals.holder,
        latestReward: latestRewardEntry
          ? {
              wallet:        this.formatWalletAddress(latestRewardEntry.winningWallet),
              amount:        latestRewardEntry.holderPrize,
              date:          latestRewardEntry.fullDateTime,
              prizeTx:       latestRewardEntry.prizeTx,
              winnerAddress: latestRewardEntry.winningWallet
            }
          : null,
        latestBurn: latestBurnEntry
          ? {
              tokensBurned: latestBurnEntry.burnAmount,
              date:         latestBurnEntry.fullDateTime,
              burnTx:       latestBurnEntry.burnTx // ✅ FIXED: Now uses actual burn TX
            }
          : null,
        recentWinners: entries
          .filter(e => e.winningWallet && e.holderPrize > 0)
          .slice(0, 10)
          .map(e => ({
            wallet: this.formatWalletAddress(e.winningWallet),
            amount: e.holderPrize,
            date:   e.fullDateTime,
            prizeTx: e.prizeTx
          })),
        recentBurns: entries
          .filter(e => e.burnAmount > 0)
          .slice(0, 10) // ✅ Show up to 10 burns
          .map(e => ({
            amount: e.burnAmount,
            date:   e.fullDateTime,
            burnTx: e.burnTx // ✅ FIXED: Now includes actual burn TX
          })),
        lastUpdated: Date.now()
      };

      // Cache result
      this.cache = { data: stats, timestamp: Date.now() };
      console.log('✨ Stats ready:', {
        events: stats.totalEvents,
        rewards: stats.totalHolderPrizes.toFixed(4),
        burned: stats.totalTokensBurned.toLocaleString()
      });

      return stats;

    } catch (error) {
      console.error('💥 Error generating stats:', error);
      return this.cache.data || this.getFallbackData();
    }
  }

  /* ────────────────
     Helpers
     ──────────────── */
  private combineDateTime(date: string, time: string): string {
    try {
      if (!date) return new Date().toISOString();
      const [d, m, y] = date.split('/');
      const isoDate   = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      const isoTime   = time || '00:00';
      return `${isoDate}T${isoTime}:00.000Z`;
    } catch (err) {
      console.warn('⚠️ combineDateTime error:', err, { date, time });
      return new Date().toISOString();
    }
  }

  private parseNumber(v: any): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = parseFloat(v.replace(/,/g, ''));
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }

  private formatWalletAddress(addr: string): string {
    if (!addr || addr.length < 8) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }

  private getTimeAgo(dateString: string): string {
    try {
      const then = new Date(dateString).getTime();
      const diffH = Math.floor((Date.now() - then) / 36e5);
      if (diffH < 1)  return 'Less than 1h ago';
      if (diffH < 24) return `${diffH}h ago`;
      const diffD = Math.floor(diffH / 24);
      if (diffD < 7)  return `${diffD}d ago`;
      return new Date(dateString).toLocaleDateString();
    } catch { return 'Recently'; }
  }

  /* Public helper to show latest info in UI */
  async getLatestInfoFormatted(): Promise<{ latestReward: string; latestBurn: string }> {
    try {
      const s = await this.getStatsData();
      return {
        latestReward: s.latestReward
          ? `${s.latestReward.amount.toFixed(4)} SOL to ${s.latestReward.wallet} (${this.getTimeAgo(s.latestReward.date)})`
          : 'No recent rewards',
        latestBurn: s.latestBurn
          ? `${s.latestBurn.tokensBurned.toLocaleString()} tokens burned (${this.getTimeAgo(s.latestBurn.date)})`
          : 'No recent burns'
      };
    } catch (err) {
      console.error('💥 Error formatting latest info:', err);
      return { latestReward: 'Unavailable', latestBurn: 'Unavailable' };
    }
  }

  /* Force refresh */
  async forceRefresh(): Promise<StatsData> {
    console.log('🔄 Manual cache bust requested');
    return this.getStatsData(true);
  }

  /* Cache status (for debugging) */
  getCacheStatus() {
    const age = Date.now() - this.cache.timestamp;
    return {
      isCached: !!this.cache.data && age < this.CACHE_DURATION,
      age:      Math.floor(age / 1000),
      expiresIn: Math.max(0, Math.floor((this.CACHE_DURATION - age) / 1000))
    };
  }

  /* Dev/CI fallback */
  private getFallbackData(): StatsData {
    console.log('📋 Supplying fallback stats (dev mode)');
    return {
      totalCreatorRewards: 0,
      totalHolderPrizes:   0,
      totalTokensBurned:   0,
      totalRevenue:        0,
      totalEvents:         0,
      totalMembers:        0,
      totalRewardsDistributed: 0,
      latestReward: null,
      latestBurn:   null,
      recentWinners: [],
      recentBurns:  [],
      lastUpdated: Date.now()
    };
  }
}

/* ────────────────
   Singleton export
   ──────────────── */
export const googleSheetsService = new GoogleSheetsService();
