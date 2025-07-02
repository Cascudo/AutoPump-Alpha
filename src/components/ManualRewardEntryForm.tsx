// src/components/ManualRewardEntryForm.tsx - SECURED VERSION
import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { googleSheetsService, ManualRewardEntry } from '../utils/googleSheetsService';
import { isAuthorizedAdmin } from '../utils/adminAuth';

export const ManualRewardEntryForm: FC = () => {
  const { publicKey } = useWallet();
  const [formData, setFormData] = useState<Partial<ManualRewardEntry>>({
    creatorRewards: 0,
    holderPrize: 0,
    burn: 0,
    rev: 0,
    winningWallet: '',
    prizeTx: '',
    burnAmount: 0,
    burnTx: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Security check - only render if admin
  const isAdmin = isAuthorizedAdmin(publicKey?.toString() || null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Security: Don&apos;t render form if not admin
  if (!isAdmin) {
    return (
      <div className="bg-gradient-to-br from-red-800/30 to-red-900/30 rounded-3xl p-8 border border-red-500/20">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Access Restricted</h2>
          <p className="text-gray-300">
            This form is only accessible to authorized administrators.
          </p>
        </div>
      </div>
    );
  }

  // Auto-calculate distribution when creator rewards changes
  const handleCreatorRewardsChange = (value: number) => {
    const suggested = googleSheetsService.calculateSuggestedDistribution(value);
    setFormData(prev => ({
      ...prev,
      ...suggested
    }));
    setErrors([]);
    setSubmitResult(null);
  };

  const handleInputChange = (field: keyof ManualRewardEntry, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors([]);
    setSubmitResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check admin status before submission
    if (!isAdmin) {
      setSubmitResult({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
      return;
    }
    
    // Validate the form
    const validation = googleSheetsService.validateRewardEntry(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      console.log('🔒 Admin submitting reward entry:', {
        admin: publicKey?.toString(),
        amount: formData.holderPrize,
        winner: formData.winningWallet?.slice(0, 8) + '...'
      });

      const success = await googleSheetsService.appendRewardEntry(formData as ManualRewardEntry);
      
      if (success) {
        setSubmitResult({
          success: true,
          message: '✅ Reward entry logged successfully to Google Sheets!'
        });
        
        // Reset form
        setFormData({
          creatorRewards: 0,
          holderPrize: 0,
          burn: 0,
          rev: 0,
          winningWallet: '',
          prizeTx: '',
          burnAmount: 0,
          burnTx: ''
        });
      } else {
        setSubmitResult({
          success: false,
          message: '❌ Failed to log entry to Google Sheets. Check console for details.'
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitResult({
        success: false,
        message: `❌ Error: ${error.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      creatorRewards: 0,
      holderPrize: 0,
      burn: 0,
      rev: 0,
      winningWallet: '',
      prizeTx: '',
      burnAmount: 0,
      burnTx: ''
    });
    setErrors([]);
    setSubmitResult(null);
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
      
      {/* Security Badge */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <span className="mr-3">📝</span>
          Manual Reward Entry
        </h2>
        <div className="bg-green-900/30 rounded-full px-4 py-2 border border-green-500/30">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-semibold">ADMIN AUTHORIZED</span>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Date/Time Preview */}
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Entry Timestamp</h3>
              <p className="text-gray-400 text-sm">This entry will be logged with the current date/time</p>
            </div>
            <div className="text-right">
              <div className="text-teal-400 font-bold">
                {currentDateTime.toLocaleDateString('en-GB')} {currentDateTime.toLocaleTimeString('en-GB', { hour12: false })}
              </div>
              <div className="text-gray-500 text-xs">
                Date: {currentDateTime.toLocaleDateString('en-GB')} | Time: {currentDateTime.toLocaleTimeString('en-GB', { hour12: false })}
              </div>
            </div>
          </div>
        </div>

        {/* Creator Rewards Input */}
        <div>
          <label className="block text-white font-semibold mb-2">
            Creator Rewards Received (SOL)
            <span className="text-red-400 ml-1">*</span>
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={formData.creatorRewards || ''}
            onChange={(e) => handleCreatorRewardsChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-teal-400 focus:outline-none"
            placeholder="e.g., 0.3350"
            required
          />
          <p className="text-gray-400 text-sm mt-1">
            Total SOL received from Pump.fun creator fees
          </p>
        </div>

        {/* Auto-calculated Distribution */}
        <div className="bg-teal-900/20 rounded-xl p-6 border border-teal-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Auto-calculated Distribution (40/30/30)</h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-green-400 font-semibold mb-2">
                Holder Prize (40%)
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={formData.holderPrize || ''}
                onChange={(e) => handleInputChange('holderPrize', parseFloat(e.target.value) || 0)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-green-400 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-orange-400 font-semibold mb-2">
                Burns (30%)
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={formData.burn || ''}
                onChange={(e) => handleInputChange('burn', parseFloat(e.target.value) || 0)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-purple-400 font-semibold mb-2">
                Operations (30%)
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={formData.rev || ''}
                onChange={(e) => handleInputChange('rev', parseFloat(e.target.value) || 0)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-400 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Winner Details & Transactions */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Winner & Transaction Details</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-semibold mb-2">
                Winning Wallet Address
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.winningWallet || ''}
                onChange={(e) => handleInputChange('winningWallet', e.target.value)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-teal-400 focus:outline-none font-mono text-sm"
                placeholder="e.g., ByYqV4Sn6yovrHMyJFs7ngSkbVYXQAdHyT2S9f2gX6EB"
                required
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Prize Transaction Link
              </label>
              <input
                type="url"
                value={formData.prizeTx || ''}
                onChange={(e) => handleInputChange('prizeTx', e.target.value)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-teal-400 focus:outline-none"
                placeholder="https://solscan.io/tx/..."
              />
            </div>
          </div>

          {/* Token Burn Details */}
          <div className="bg-orange-900/20 rounded-xl p-6 border border-orange-500/20">
            <h4 className="text-orange-400 font-semibold mb-4">Token Burn Details (Optional)</h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-semibold mb-2">
                  Token Burn Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.burnAmount || ''}
                  onChange={(e) => handleInputChange('burnAmount', parseInt(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
                  placeholder="e.g., 250000"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Number of ALPHA tokens burned
                </p>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Burn Transaction Link
                </label>
                <input
                  type="url"
                  value={formData.burnTx || ''}
                  onChange={(e) => handleInputChange('burnTx', e.target.value)}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
                  placeholder="https://solscan.io/tx/..."
                />
                <p className="text-gray-400 text-sm mt-1">
                  Link to the token burn transaction
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4">
            <h4 className="text-red-400 font-semibold mb-2">Please fix the following errors:</h4>
            <ul className="text-red-300 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Success/Error Result */}
        {submitResult && (
          <div className={`rounded-xl p-4 border ${
            submitResult.success 
              ? 'bg-green-900/20 border-green-500/20' 
              : 'bg-red-900/20 border-red-500/20'
          }`}>
            <p className={`font-semibold ${submitResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {submitResult.message}
            </p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting || errors.length > 0 || !isAdmin}
            className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Logging to Sheets...</span>
              </>
            ) : (
              <>
                <span>📝</span>
                <span>Log Reward Distribution</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
          >
            Reset Form
          </button>
        </div>
      </form>

      {/* Quick Help */}
      <div className="mt-6 p-4 bg-blue-900/20 rounded-xl border border-blue-500/20">
        <h4 className="text-blue-400 font-semibold mb-2">💡 Quick Guide:</h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>1. Enter the total SOL received from Pump.fun creator fees</li>
          <li>2. Distribution will auto-calculate (you can adjust if needed)</li>
          <li>3. Add the winner&apos;s wallet address and transaction link</li>
          <li>4. Click &quot;Log Reward Distribution&quot; to save to Google Sheets</li>
          <li>5. Add burn details when token burning is complete</li>
        </ul>
      </div>
    </div>
  );
};