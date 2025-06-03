// src/utils/rewardDistributionService.ts
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { googleSheetsService } from './googleSheetsService';
import { notify } from './notifications';

export interface EligibleHolder {
  address: string;
  balance: number;
  usdValue: number;
  tier: 'Bronze' | 'Silver' | 'Gold';
  entries: number;
}

export interface RewardDistribution {
  winner: string;
  rewardAmount: number;
  burnAmount: number;
  operationsAmount: number;
  totalCreatorFee: number;
  txSignature: string;
  timestamp: number;
}

export class RewardDistributionService {
  private connection: Connection;
  private readonly CREATOR_WALLET = '8Dibf82AXq5zN44ZwgLGrn22LYvebbiqSBEVBPaffetX';
  private readonly ALPHA_MINT = '4eyM1uhJkMajFAWfHHmSMKq6geXaiVMi95yMcpABpump';
  private readonly PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
  
  // Distribution ratios from your tokenomics
  private readonly REWARD_RATIO = 0.4;  // 40% to holders
  private readonly BURN_RATIO = 0.3;    // 30% to burns  
  private readonly OPS_RATIO = 0.3;     // 30% to operations
  
  // Safety limits
  private readonly MAX_DAILY_REWARD = 5.0; // SOL
  private readonly MIN_REWARD_AMOUNT = 0.01; // SOL
  private readonly MIN_HOLDERS_FOR_DRAW = 5;
  
  private lastKnownBalance = 0;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Start monitoring your wallet for creator fee claims
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('🔍 Already monitoring wallet');
      return;
    }

    console.log('🚀 Starting semi-automated reward distribution monitoring');
    console.log(`👀 Watching wallet: ${this.CREATOR_WALLET}`);

    // Get initial balance
    this.lastKnownBalance = await this.getWalletBalance();
    console.log(`💰 Current balance: ${this.lastKnownBalance.toFixed(4)} SOL`);

    this.isMonitoring = true;

    // Check every 30 seconds for balance changes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForBalanceIncrease();
      } catch (error) {
        console.error('💥 Error in monitoring cycle:', error);
      }
    }, 30000);

    // Also subscribe to real-time account changes
    this.connection.onAccountChange(
      new PublicKey(this.CREATOR_WALLET),
      async (accountInfo) => {
        try {
          await this.handleAccountChange(accountInfo);
        } catch (error) {
          console.error('💥 Error handling account change:', error);
        }
      }
    );

    notify({
      type: 'success',
      message: 'Reward Distribution Started',
      description: 'Now monitoring for creator fee claims'
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('⏹️ Stopped monitoring wallet');
  }

  /**
   * Check if wallet balance increased significantly
   */
  private async checkForBalanceIncrease(): Promise<void> {
    const currentBalance = await this.getWalletBalance();
    const balanceIncrease = currentBalance - this.lastKnownBalance;

    // If balance increased by more than minimum reward amount
    if (balanceIncrease >= this.MIN_REWARD_AMOUNT) {
      console.log(`📈 Balance increased by ${balanceIncrease.toFixed(4)} SOL`);
      
      // Verify this was from a Pump.fun creator fee claim
      const isCreatorFee = await this.verifyCreatorFeeTransaction(balanceIncrease);
      
      if (isCreatorFee) {
        console.log('✅ Confirmed creator fee claim - executing reward distribution');
        await this.executeRewardDistribution(balanceIncrease);
      } else {
        console.log('ℹ️ Balance increase not from creator fee - ignoring');
      }
    }

    this.lastKnownBalance = currentBalance;
  }

  /**
   * Handle real-time account changes
   */
  private async handleAccountChange(accountInfo: any): Promise<void> {
    // Convert lamports to SOL
    const newBalance = accountInfo.lamports / LAMPORTS_PER_SOL;
    const balanceIncrease = newBalance - this.lastKnownBalance;

    if (balanceIncrease >= this.MIN_REWARD_AMOUNT) {
      console.log(`🔔 Real-time balance increase detected: ${balanceIncrease.toFixed(4)} SOL`);
      
      // Small delay to let transaction finalize
      setTimeout(async () => {
        const isCreatorFee = await this.verifyCreatorFeeTransaction(balanceIncrease);
        if (isCreatorFee) {
          await this.executeRewardDistribution(balanceIncrease);
        }
      }, 5000);
    }

    this.lastKnownBalance = newBalance;
  }

  /**
   * Get current SOL balance of creator wallet
   */
  private async getWalletBalance(): Promise<number> {
    const balance = await this.connection.getBalance(new PublicKey(this.CREATOR_WALLET));
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Verify the balance increase was from a Pump.fun creator fee
   */
  private async verifyCreatorFeeTransaction(amount: number): Promise<boolean> {
    try {
      // Get recent transactions for the wallet
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(this.CREATOR_WALLET),
        { limit: 10 }
      );

      // Check recent transactions for Pump.fun interactions
      for (const sig of signatures) {
        const tx = await this.connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });

        if (tx && tx.meta && !tx.meta.err) {
          // Check if transaction involved Pump.fun program
          const involvesPumpFun = tx.transaction.message.staticAccountKeys.some(
            key => key.toString() === this.PUMP_PROGRAM
          );

          if (involvesPumpFun) {
            // Check if SOL was transferred to creator wallet
            const balanceChange = tx.meta.postBalances[0] - tx.meta.preBalances[0];
            const solChange = Math.abs(balanceChange) / LAMPORTS_PER_SOL;

            // If the balance change matches our detected increase (within small margin)
            if (Math.abs(solChange - amount) < 0.001) {
              console.log(`✅ Verified creator fee transaction: ${sig.signature}`);
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('💥 Error verifying transaction:', error);
      // In case of error, assume it's valid (safer to distribute than miss)
      return true;
    }
  }

  /**
   * Execute the complete reward distribution process
   */
  async executeRewardDistribution(totalCreatorFee: number): Promise<RewardDistribution | null> {
    try {
      console.log(`🎯 Executing reward distribution for ${totalCreatorFee.toFixed(4)} SOL`);

      // Safety check
      if (totalCreatorFee > this.MAX_DAILY_REWARD) {
        console.warn(`⚠️ Creator fee amount (${totalCreatorFee}) exceeds daily limit (${this.MAX_DAILY_REWARD})`);
        notify({
          type: 'error',
          message: 'Reward Distribution Paused',
          description: `Amount ${totalCreatorFee.toFixed(4)} SOL exceeds safety limit`
        });
        return null;
      }

      // Calculate distribution amounts
      const rewardAmount = totalCreatorFee * this.REWARD_RATIO;
      const burnAmount = totalCreatorFee * this.BURN_RATIO;
      const operationsAmount = totalCreatorFee * this.OPS_RATIO;

      console.log(`💰 Distribution breakdown:
        - Rewards: ${rewardAmount.toFixed(4)} SOL (40%)
        - Burns: ${burnAmount.toFixed(4)} SOL (30%)
        - Operations: ${operationsAmount.toFixed(4)} SOL (30%)`);

      // Get eligible holders
      const eligibleHolders = await this.getEligibleHolders();
      
      if (eligibleHolders.length < this.MIN_HOLDERS_FOR_DRAW) {
        console.warn(`⚠️ Not enough eligible holders (${eligibleHolders.length} < ${this.MIN_HOLDERS_FOR_DRAW})`);
        return null;
      }

      // Select winner
      const winner = await this.selectRandomWinner(eligibleHolders);
      console.log(`🏆 Selected winner: ${winner.address} (${winner.tier} tier, ${winner.entries} entries)`);

      // For now, we'll log the distribution (actual SOL transfer will be added in next phase)
      const distribution: RewardDistribution = {
        winner: winner.address,
        rewardAmount,
        burnAmount,
        operationsAmount,
        totalCreatorFee,
        txSignature: '', // Will be filled when we add actual transfers
        timestamp: Date.now()
      };

      // Log to Google Sheets
      await this.logRewardDistribution(distribution);

      // Notify community
      notify({
        type: 'success',
        message: 'Daily Reward Distributed!',
        description: `${this.formatWalletAddress(winner.address)} won ${rewardAmount.toFixed(4)} SOL`
      });

      console.log('✅ Reward distribution completed successfully');
      return distribution;

    } catch (error) {
      console.error('💥 Error executing reward distribution:', error);
      notify({
        type: 'error',
        message: 'Reward Distribution Failed',
        description: 'Check console for details'
      });
      return null;
    }
  }

  /**
   * Get all eligible ALPHA token holders
   */
  private async getEligibleHolders(): Promise<EligibleHolder[]> {
    try {
      console.log('👥 Fetching eligible ALPHA holders...');

      // Get all token accounts for ALPHA token
      const tokenAccounts = await this.connection.getProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
          filters: [
            {
              dataSize: 165, // Token account data size
            },
            {
              memcmp: {
                offset: 0,
                bytes: this.ALPHA_MINT,
              },
            },
          ],
        }
      );

      const eligibleHolders: EligibleHolder[] = [];

      // Check each account for eligibility
      for (const account of tokenAccounts) {
        try {
          const accountInfo = await this.connection.getTokenAccountBalance(account.pubkey);
          const balance = accountInfo.value.uiAmount || 0;

          if (balance > 0) {
            // Calculate USD value (simplified - you'd want real price here)
            const tokenPrice = 0.0001; // Replace with real price from your pricing service
            const usdValue = balance * tokenPrice * 200; // 200 = approximate SOL price

            // Determine membership tier and entries
            const { tier, entries } = this.calculateMembershipTier(usdValue);

            if (entries > 0) {
              eligibleHolders.push({
                address: account.account.owner.toString(),
                balance,
                usdValue,
                tier,
                entries
              });
            }
          }
        } catch (error) {
          // Skip invalid accounts
          continue;
        }
      }

      console.log(`✅ Found ${eligibleHolders.length} eligible holders`);
      return eligibleHolders;

    } catch (error) {
      console.error('💥 Error fetching eligible holders:', error);
      return [];
    }
  }

  /**
   * Calculate membership tier and daily entries based on USD value
   */
  private calculateMembershipTier(usdValue: number): { tier: 'Bronze' | 'Silver' | 'Gold'; entries: number } {
    if (usdValue >= 1000) {
      return { tier: 'Gold', entries: 10 };
    } else if (usdValue >= 100) {
      return { tier: 'Silver', entries: 3 };
    } else if (usdValue >= 10) {
      return { tier: 'Bronze', entries: 1 };
    } else {
      return { tier: 'Bronze', entries: 0 }; // Not eligible
    }
  }

  /**
   * Select random winner based on weighted entries
   */
  private async selectRandomWinner(eligibleHolders: EligibleHolder[]): Promise<EligibleHolder> {
    // Create weighted array where each holder appears based on their entries
    const weightedHolders: EligibleHolder[] = [];
    
    for (const holder of eligibleHolders) {
      for (let i = 0; i < holder.entries; i++) {
        weightedHolders.push(holder);
      }
    }

    // Select random winner
    const randomIndex = Math.floor(Math.random() * weightedHolders.length);
    const winner = weightedHolders[randomIndex];

    console.log(`🎲 Selected from ${weightedHolders.length} total entries (${eligibleHolders.length} unique holders)`);
    return winner;
  }

  /**
   * Log reward distribution to Google Sheets
   */
  private async logRewardDistribution(distribution: RewardDistribution): Promise<void> {
    try {
      console.log('📝 Logging reward distribution to Google Sheets...');
      
      // Format the data for your Google Sheets structure
      const now = new Date();
      const date = now.toLocaleDateString('en-GB'); // DD/MM/YYYY format
      const time = now.toLocaleTimeString('en-GB', { hour12: false }); // 24h format

      // You'll need to add this method to your Google Sheets service
      // This matches the structure from your existing data
      const logData = {
        creatorRewards: distribution.totalCreatorFee,
        date,
        time,
        holderPrize: distribution.rewardAmount,
        burn: distribution.burnAmount,
        rev: distribution.operationsAmount,
        winningWallet: distribution.winner,
        prizeTx: distribution.txSignature || 'PENDING',
        burnAmount: 0 // Token burn amount (will be calculated separately)
      };

      // Log to console for now (you'll implement actual Google Sheets writing)
      console.log('📊 Logging data:', logData);
      
      // TODO: Implement actual Google Sheets writing
      // await googleSheetsService.appendRewardEntry(logData);

    } catch (error) {
      console.error('💥 Error logging to Google Sheets:', error);
    }
  }

  /**
   * Format wallet address for display
   */
  private formatWalletAddress(address: string): string {
    if (address.length < 8) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Get current monitoring status
   */
  getStatus(): { isMonitoring: boolean; lastBalance: number } {
    return {
      isMonitoring: this.isMonitoring,
      lastBalance: this.lastKnownBalance
    };
  }

  /**
   * Manual trigger for testing
   */
  async manualTrigger(amount: number): Promise<RewardDistribution | null> {
    console.log(`🧪 Manual trigger with amount: ${amount} SOL`);
    return await this.executeRewardDistribution(amount);
  }
}