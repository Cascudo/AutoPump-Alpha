// src/pages/giveaway/[id].tsx
// Fixed dynamic giveaway landing page with proper error handling
import type { NextPage, GetServerSideProps } from "next";
import Head from "next/head";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { GiveawayLandingPage } from '../../components/GiveawayLandingPage';

interface GiveawayPageProps {
  giveaway?: any;
  error?: string;
}

const GiveawayPage: NextPage<GiveawayPageProps> = ({ giveaway, error }) => {
  const router = useRouter();
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900/20 flex items-center justify-center">
        <Head>
          <title>Giveaway Error - ALPHA Club</title>
        </Head>
        <div className="text-center max-w-2xl mx-auto px-4">
          <div className="text-6xl mb-8">❌</div>
          <h1 className="text-4xl font-bold text-white mb-4">Giveaway Not Found</h1>
          <p className="text-xl text-gray-300 mb-8">{error}</p>
          <div className="space-y-4">
            <button
              onClick={() => router.push('/giveaway')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-xl transition-all mr-4"
            >
              View Other Giveaways
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!giveaway) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900/20 flex items-center justify-center">
        <Head>
          <title>Loading Giveaway - ALPHA Club</title>
        </Head>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-8"></div>
          <h1 className="text-2xl font-bold text-white mb-4">Loading Giveaway...</h1>
          <p className="text-gray-300">Please wait while we fetch the details</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{giveaway.title} - ALPHA Club Giveaway</title>
        <meta name="description" content={`Win ${giveaway.title}! Prize value: $${giveaway.prize_value?.toLocaleString()}. Enter now with ALPHA tokens.`} />
        <meta property="og:title" content={`${giveaway.title} - ALPHA Club Giveaway`} />
        <meta property="og:description" content={`Win ${giveaway.title}! Prize value: $${giveaway.prize_value?.toLocaleString()}`} />
        <meta property="og:image" content={giveaway.prize_images?.[0] || '/alpha-logo-307x307px.png'} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      
      <GiveawayLandingPage giveaway={giveaway} />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  
  try {
    console.log('🔍 [Giveaway Detail] Fetching giveaway:', id);

    // Fetch giveaway directly from database instead of API
    const { data: giveaway, error } = await supabase
      .from('promotional_giveaways')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ [Giveaway Detail] Database error:', error);
      
      if (error.code === 'PGRST116') {
        return {
          props: {
            error: 'Giveaway not found. It may have been removed or the ID is incorrect.'
          }
        };
      }
      
      return {
        props: {
          error: `Database error: ${error.message}`
        }
      };
    }

    if (!giveaway) {
      console.log('📭 [Giveaway Detail] No giveaway found with ID:', id);
      return {
        props: {
          error: 'Giveaway not found. It may have been removed or the ID is incorrect.'
        }
      };
    }

    console.log('✅ [Giveaway Detail] Found giveaway:', giveaway.title, 'Status:', giveaway.status);

    // Add computed fields for the frontend
    const enrichedGiveaway = {
      ...giveaway,
      // Ensure proper typing for frontend
      prize_images: giveaway.prize_images || [],
      total_entries: giveaway.total_entries || 0,
      total_participants: giveaway.total_participants || 0,
      total_entry_sales: giveaway.total_entry_sales || 0,
      // Parse entry packages if stored as JSON string
      entry_packages: typeof giveaway.entry_packages === 'string' 
        ? JSON.parse(giveaway.entry_packages) 
        : giveaway.entry_packages || []
    };

    return {
      props: {
        giveaway: enrichedGiveaway
      }
    };

  } catch (error) {
    console.error('💥 [Giveaway Detail] Unexpected error:', error);
    return {
      props: {
        error: `Failed to load giveaway: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }
};

export default GiveawayPage;