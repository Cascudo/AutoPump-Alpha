// src/pages/api/admin/early-bird-promotion.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabaseClient } from '../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminClient = getAdminSupabaseClient();
  if (!adminClient) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (req.method === 'POST') {
    return createEarlyBirdPromotion(req, res, adminClient);
  } else if (req.method === 'GET') {
    return getActivePromotions(req, res, adminClient);
  } else if (req.method === 'PUT') {
    return updatePromotion(req, res, adminClient);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Create new early bird promotion
async function createEarlyBirdPromotion(req: NextApiRequest, res: NextApiResponse, adminClient: any) {
  try {
    const { promotionName, bonusEntries, startDate, endDate, createdBy } = req.body;

    if (!promotionName || !bonusEntries || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: promotionName, bonusEntries, startDate, endDate' 
      });
    }

    console.log('🎯 Creating early bird promotion:', {
      name: promotionName,
      bonus: bonusEntries,
      start: startDate,
      end: endDate
    });

    const { data: promotion, error } = await adminClient
      .from('early_bird_promotions')
      .insert({
        promotion_name: promotionName,
        bonus_entries: bonusEntries,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        created_by: createdBy || 'Admin'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating promotion:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Early bird promotion created:', promotion.id);

    return res.status(200).json({
      success: true,
      promotion,
      message: `Early bird promotion "${promotionName}" created successfully`
    });

  } catch (error) {
    console.error('❌ Error creating early bird promotion:', error);
    return res.status(500).json({ 
      error: 'Failed to create promotion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get active promotions
async function getActivePromotions(req: NextApiRequest, res: NextApiResponse, adminClient: any) {
  try {
    const { data: promotions, error } = await adminClient
      .from('early_bird_promotions')
      .select('*')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching promotions:', error);
      return res.status(500).json({ error: error.message });
    }

    // Also get all promotions (including expired) for admin overview
    const { data: allPromotions, error: allError } = await adminClient
      .from('early_bird_promotions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    return res.status(200).json({
      success: true,
      activePromotions: promotions || [],
      allPromotions: allPromotions || [],
      currentlyActive: promotions?.length || 0
    });

  } catch (error) {
    console.error('❌ Error fetching promotions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch promotions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Update promotion (activate/deactivate)
async function updatePromotion(req: NextApiRequest, res: NextApiResponse, adminClient: any) {
  try {
    const { promotionId, isActive, adminWallet } = req.body;

    if (!promotionId || isActive === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: promotionId, isActive' 
      });
    }

    console.log('🔄 Updating promotion:', {
      id: promotionId,
      active: isActive,
      admin: adminWallet?.slice(0, 8) + '...'
    });

    const { data: updatedPromotion, error } = await adminClient
      .from('early_bird_promotions')
      .update({ is_active: isActive })
      .eq('id', promotionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating promotion:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Promotion updated successfully');

    return res.status(200).json({
      success: true,
      promotion: updatedPromotion,
      message: `Promotion ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('❌ Error updating promotion:', error);
    return res.status(500).json({ 
      error: 'Failed to update promotion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}