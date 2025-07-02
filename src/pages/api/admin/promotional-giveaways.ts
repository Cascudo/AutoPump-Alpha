// ===============================================
// CLEAN ADMIN API - GUARANTEED WORKING VERSION
// src/pages/api/admin/promotional-giveaways.ts
// ===============================================

import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabaseClient } from '../../../utils/supabaseClient';
import { verifyAdminAccess } from '../../../utils/adminAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🎁 Admin promotional giveaways API called:', req.method);

  // Verify admin access
  const adminWallet = req.headers['x-admin-wallet'] as string;
  console.log('🔐 Admin wallet from header:', adminWallet?.slice(0, 8) + '...');
  
  if (!verifyAdminAccess(adminWallet)) {
    console.log('❌ Admin access denied for wallet:', adminWallet);
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Use service role client for admin operations
  const supabase = getAdminSupabaseClient();

  if (req.method === 'GET') {
    try {
      const { data: giveaways, error } = await supabase
        .from('promotional_giveaways')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🚨 Fetch giveaways error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(giveaways);
    } catch (error) {
      console.error('🚨 Admin giveaways GET error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log('📝 Creating giveaway with body:', JSON.stringify(req.body, null, 2));

      const {
        title,
        description,
        prizeType,
        prizeValue,
        prizeDescription,
        prizeImages,
        entryPackages,
        entryStartDate,
        entryEndDate,
        drawDate,
        isFeatured
      } = req.body;

      // Validate required fields
      if (!title || !prizeDescription || !prizeValue) {
        return res.status(400).json({ 
          error: 'Missing required fields: title, prizeDescription, prizeValue' 
        });
      }

      // Use defaults for dates if not provided
      const now = new Date();
      const startDate = entryStartDate ? new Date(entryStartDate) : new Date(now.getTime() + (60 * 60 * 1000));
      const endDate = entryEndDate ? new Date(entryEndDate) : new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const drawDate_parsed = drawDate ? new Date(drawDate) : new Date(now.getTime() + (8 * 24 * 60 * 60 * 1000));

      // Default packages if none provided
      const defaultPackages = [
        { id: 1, name: "Starter", price: 4.99, entries: 1, popular: false },
        { id: 2, name: "Popular", price: 9.99, entries: 3, popular: true },
        { id: 3, name: "Value", price: 19.99, entries: 10, popular: false }
      ];

      // Clean images array
      const cleanImages = prizeImages 
        ? prizeImages.filter((img: string) => img && img.trim().length > 0)
        : [];

      console.log('📝 Creating giveaway with data:', {
        title,
        prize_type: prizeType || 'physical',
        prize_value: prizeValue,
        entry_packages: entryPackages || defaultPackages,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        drawDate: drawDate_parsed.toISOString(),
        imagesCount: cleanImages.length
      });

      // Create giveaway
      const { data: giveaway, error } = await supabase
        .from('promotional_giveaways')
        .insert({
          title,
          description: description || null,
          prize_type: prizeType || 'physical',
          prize_value: prizeValue,
          prize_description: prizeDescription,
          prize_image_url: cleanImages[0] || null,
          prize_images: cleanImages.length > 0 ? cleanImages : null,
          entry_packages: entryPackages || defaultPackages,
          entry_start_date: startDate.toISOString(),
          entry_end_date: endDate.toISOString(),
          draw_date: drawDate_parsed.toISOString(),
          status: 'upcoming',
          is_featured: isFeatured || false,
          total_entries: 0,
          total_revenue: 0,
          created_by: adminWallet
        })
        .select()
        .single();

      if (error) {
        console.error('🚨 Giveaway creation error:', error);
        return res.status(500).json({ 
          error: 'Failed to create giveaway',
          details: error.message 
        });
      }

      console.log('✅ Giveaway created successfully:', giveaway.id);

      return res.status(201).json({
        success: true,
        message: 'Giveaway created successfully',
        giveaway
      });

    } catch (error) {
      console.error('🚨 Admin giveaway creation error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}