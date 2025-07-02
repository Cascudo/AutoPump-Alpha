// src/pages/giveaway/index.tsx
// Fixed giveaway index page with proper error handling
import type { NextPage, GetServerSideProps } from "next";
import Head from "next/head";
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';

interface GiveawayIndexProps {
  activeGiveaway?: any;
  error?: string;
}

const GiveawayIndex: NextPage<GiveawayIndexProps> = ({ activeGiveaway, error }) => {
  const [loading, setLoading] = useState(false);

  // If we have an active giveaway from SSR, redirect immediately
  useEffect(() => {
    if (activeGiveaway?.id && !loading) {
      setLoading(true);
      window.location.href = `/giveaway/${activeGiveaway.id}`;
    }
  }, [activeGiveaway, loading]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900/20 flex items-center justify-center">
        <Head>
          <title>Giveaway Error - ALPHA Club</title>
        </Head>
        <div className="text-center max-w-2xl mx-auto px-4">
          <div className="text-6xl mb-8">❌</div>
          <h1 className="text-4xl font-bold text-white mb-4">Giveaway Error</h1>
          <p className="text-xl text-gray-300 mb-8">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!activeGiveaway) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900/20 flex items-center justify-center">
        <Head>
          <title>No Active Giveaways - ALPHA Club</title>
        </Head>
        <div className="text-center max-w-2xl mx-auto px-4">
          <div className="text-6xl mb-8">⏰</div>
          <h1 className="text-4xl font-bold text-white mb-4">No Active Giveaways</h1>
          <p className="text-xl text-gray-300 mb-8">
            There are currently no active giveaways. Check back soon for exciting new prizes!
          </p>
          
          {/* Check for upcoming giveaways */}
          <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/20 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">🚀 Coming Soon</h3>
            <p className="text-gray-300 mb-6">
              We&apos;re preparing amazing giveaways for ALPHA holders and VIP members. 
              Make sure you have at least $10 worth of ALPHA tokens to automatically enter!
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-left">
              <div className="bg-black/40 rounded-lg p-4">
                <div className="text-teal-400 font-bold text-lg mb-2">💰 Auto Entries</div>
                <div className="text-gray-300 text-sm">Hold $10+ ALPHA to automatically get entries</div>
              </div>
              <div className="bg-black/40 rounded-lg p-4">
                <div className="text-purple-400 font-bold text-lg mb-2">⭐ VIP Bonus</div>
                <div className="text-gray-300 text-sm">VIP members get 2x-5x entry multipliers</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold py-3 px-8 rounded-xl transition-all mr-4"
            >
              View Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/vip'}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
            >
              Upgrade to VIP
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900/20 flex items-center justify-center">
      <Head>
        <title>Redirecting to Giveaway - ALPHA Club</title>
      </Head>
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-8"></div>
        <h1 className="text-2xl font-bold text-white mb-4">Redirecting to Active Giveaway...</h1>
        <p className="text-gray-300">Taking you to: {activeGiveaway.title}</p>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    console.log('🔍 [Giveaway Index] Fetching active giveaways...');

    // First, check for active giveaways
    const { data: activeGiveaways, error: activeError } = await supabase
      .from('promotional_giveaways')
      .select('*')
      .eq('status', 'active')
      .gte('entry_end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (activeError) {
      console.error('❌ [Giveaway Index] Error fetching active giveaways:', activeError);
      return {
        props: {
          error: `Database error: ${activeError.message}`
        }
      };
    }

    if (activeGiveaways && activeGiveaways.length > 0) {
      console.log('✅ [Giveaway Index] Found active giveaway:', activeGiveaways[0].title);
      return {
        redirect: {
          destination: `/giveaway/${activeGiveaways[0].id}`,
          permanent: false,
        },
      };
    }

    // If no active giveaways, check for upcoming ones that should be active
    console.log('⏰ [Giveaway Index] No active giveaways found, checking upcoming...');
    
    const { data: upcomingGiveaways, error: upcomingError } = await supabase
      .from('promotional_giveaways')
      .select('*')
      .eq('status', 'upcoming')
      .lte('entry_start_date', new Date().toISOString())
      .gte('entry_end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (upcomingError) {
      console.error('❌ [Giveaway Index] Error fetching upcoming giveaways:', upcomingError);
      return {
        props: {
          error: `Database error: ${upcomingError.message}`
        }
      };
    }

    if (upcomingGiveaways && upcomingGiveaways.length > 0) {
      console.log('🎯 [Giveaway Index] Found upcoming giveaway that should be active:', upcomingGiveaways[0].title);
      
      // Activate the giveaway
      const { error: updateError } = await supabase
        .from('promotional_giveaways')
        .update({ status: 'active' })
        .eq('id', upcomingGiveaways[0].id);

      if (updateError) {
        console.error('❌ [Giveaway Index] Error activating giveaway:', updateError);
        return {
          props: {
            error: `Failed to activate giveaway: ${updateError.message}`
          }
        };
      }

      console.log('✅ [Giveaway Index] Activated giveaway, redirecting...');
      return {
        redirect: {
          destination: `/giveaway/${upcomingGiveaways[0].id}`,
          permanent: false,
        },
      };
    }

    // No active or upcoming giveaways
    console.log('📭 [Giveaway Index] No giveaways found');
    return {
      props: {
        activeGiveaway: null
      }
    };

  } catch (error) {
    console.error('💥 [Giveaway Index] Unexpected error:', error);
    return {
      props: {
        error: `Unexpected error: ${error.message}`
      }
    };
  }
};

export default GiveawayIndex;