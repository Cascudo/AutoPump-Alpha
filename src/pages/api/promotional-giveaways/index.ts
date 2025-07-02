// src/pages/api/promotional-giveaways/index.ts
// PUBLIC API: GET ACTIVE PROMOTIONAL GIVEAWAYS

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get public giveaways (active, upcoming, ended for viewing)
    const { data: giveaways, error } = await supabase
      .from('promotional_giveaways')
      .select('*')
      .in('status', ['upcoming', 'active', 'ended', 'drawn'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching giveaways:', error);
      throw error;
    }

    res.status(200).json({ giveaways: giveaways || [] });

  } catch (error) {
    console.error('Error fetching promotional giveaways:', error);
    res.status(500).json({ error: 'Failed to fetch giveaways' });
  }
}