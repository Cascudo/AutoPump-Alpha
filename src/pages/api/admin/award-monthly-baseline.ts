// src/pages/api/admin/award-monthly-baseline.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabaseClient } from '../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminClient = getAdminSupabaseClient();
    if (!adminClient) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    console.log('🎯 Starting monthly baseline entry awards...');

    // Call the secure database function
    const { data: awardedUsers, error } = await adminClient.rpc('award_monthly_baseline_entries');

    if (error) {
      console.error('❌ Monthly baseline award error:', error);
      return res.status(500).json({ error: error.message });
    }

    const totalAwarded = awardedUsers?.reduce((sum: number, user: any) => sum + user.entries_awarded, 0) || 0;

    console.log('✅ Monthly baseline entries awarded:', {
      usersAwarded: awardedUsers?.length || 0,
      totalEntriesAwarded: totalAwarded
    });

    return res.status(200).json({
      success: true,
      usersAwarded: awardedUsers?.length || 0,
      totalEntriesAwarded: totalAwarded,
      awardedUsers
    });

  } catch (error) {
    console.error('❌ Monthly baseline award API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}