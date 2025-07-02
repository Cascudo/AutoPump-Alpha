// ===============================================
// FIXED AdminGiveawayCreator - Uses Correct Admin Headers
// src/components/AdminGiveawayCreator.tsx
// ===============================================

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface EntryPackage {
  id: number;
  name: string;
  price: number;
  entries: number;
  popular: boolean;
}

interface AdminGiveawayCreatorProps {
  onGiveawayCreated?: () => void;
}

const AdminGiveawayCreator: React.FC<AdminGiveawayCreatorProps> = ({ onGiveawayCreated }) => {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize_type: 'physical' as 'physical' | 'cash' | 'crypto',
    prize_value: 500,
    prize_description: '',
    prize_image_url: '',
    entry_start_date: '',
    entry_end_date: '',
    draw_date: '',
    is_featured: false
  });

  // Package management
  const [packages, setPackages] = useState<EntryPackage[]>([
    { id: 1, name: "Starter", price: 4.99, entries: 1, popular: false },
    { id: 2, name: "Popular", price: 9.99, entries: 3, popular: true },
    { id: 3, name: "Value", price: 19.99, entries: 10, popular: false }
  ]);

  // Image management
  const [images, setImages] = useState<string[]>(['']);

  const prizeTemplates = [
    {
      name: 'PlayStation 5',
      type: 'physical' as const,
      value: 500,
      description: 'Sony PlayStation 5 Console - Latest Generation Gaming',
      image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=300&fit=crop',
      packages: [
        { id: 1, name: "Starter", price: 4.99, entries: 1, popular: false },
        { id: 2, name: "Popular", price: 9.99, entries: 3, popular: true },
        { id: 3, name: "Best Value", price: 19.99, entries: 10, popular: false }
      ]
    },
    {
      name: 'MacBook Pro M3',
      type: 'physical' as const,
      value: 1200,
      description: 'Apple MacBook Pro 14" with M3 Chip - Perfect for Creators',
      image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop',
      packages: [
        { id: 1, name: "Entry", price: 9.99, entries: 1, popular: false },
        { id: 2, name: "Standard", price: 19.99, entries: 3, popular: true },
        { id: 3, name: "Premium", price: 39.99, entries: 8, popular: false }
      ]
    },
    {
      name: '$1000 Cash Prize',
      type: 'cash' as const,
      value: 1000,
      description: 'Cash Prize - Instant Transfer to Winner',
      image: 'https://images.unsplash.com/photo-1554672723-d42a16e533db?w=400&h=300&fit=crop',
      packages: [
        { id: 1, name: "Basic", price: 14.99, entries: 1, popular: false },
        { id: 2, name: "Standard", price: 29.99, entries: 2, popular: true },
        { id: 3, name: "Premium", price: 49.99, entries: 4, popular: false }
      ]
    }
  ];

  const applyTemplate = (template: typeof prizeTemplates[0]) => {
    setFormData(prev => ({
      ...prev,
      title: `Win a ${template.name}!`,
      prize_type: template.type,
      prize_value: template.value,
      prize_description: template.description,
      prize_image_url: template.image
    }));
    setPackages(template.packages);
    setImages([template.image]);
  };

  const addPackage = () => {
    const newId = Math.max(...packages.map(p => p.id)) + 1;
    setPackages(prev => [...prev, {
      id: newId,
      name: "New Package",
      price: 9.99,
      entries: 2,
      popular: false
    }]);
  };

  const updatePackage = (index: number, field: keyof EntryPackage, value: any) => {
    setPackages(prev => prev.map((pkg, i) => 
      i === index ? { ...pkg, [field]: value } : pkg
    ));
  };

  const removePackage = (index: number) => {
    if (packages.length > 1) {
      setPackages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addImage = () => {
    if (images.length < 10) {
      setImages(prev => [...prev, '']);
    }
  };

  const updateImage = (index: number, value: string) => {
    setImages(prev => prev.map((img, i) => i === index ? value : img));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!publicKey) return;

    // Validate required fields
    if (!formData.title || !formData.prize_description || !formData.prize_value) {
      alert('❌ Please fill in all required fields');
      return;
    }

    // Ensure dates are set (use defaults if not provided)
    const defaultDates = getDefaultDates();
    const startDate = formData.entry_start_date || defaultDates.start;
    const endDate = formData.entry_end_date || defaultDates.end;
    const drawDate = formData.draw_date || defaultDates.draw;

    // Validate date values
    const start = new Date(startDate);
    const end = new Date(endDate);
    const draw = new Date(drawDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(draw.getTime())) {
      alert('❌ Invalid date format. Please check your dates.');
      return;
    }

    if (start >= end || end >= draw) {
      alert('❌ Invalid date sequence. Start date must be before end date, and end date must be before draw date.');
      return;
    }

    setLoading(true);
    try {
      // Filter out empty images
      const validImages = images.filter(img => img.trim().length > 0);
      
      // ✅ FIXED: Use correct header format (same as AdminGuard)
      const response = await fetch('/api/admin/promotional-giveaways', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-wallet': publicKey.toString() // ← FIXED: Header instead of query param
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          prizeType: formData.prize_type,
          prizeValue: formData.prize_value,
          prizeDescription: formData.prize_description,
          prizeImages: validImages,
          entryPackages: packages,
          entryStartDate: startDate, // ← Use validated dates
          entryEndDate: endDate,
          drawDate: drawDate,
          isFeatured: formData.is_featured
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Giveaway "${formData.title}" created successfully with ${packages.length} packages!`);
        // Reset form
        setFormData({
          title: '',
          description: '',
          prize_type: 'physical',
          prize_value: 500,
          prize_description: '',
          prize_image_url: '',
          entry_start_date: '',
          entry_end_date: '',
          draw_date: '',
          is_featured: false
        });
        setPackages([
          { id: 1, name: "Starter", price: 4.99, entries: 1, popular: false },
          { id: 2, name: "Popular", price: 9.99, entries: 3, popular: true },
          { id: 3, name: "Value", price: 19.99, entries: 10, popular: false }
        ]);
        setImages(['']);
        onGiveawayCreated?.();
      } else {
        throw new Error(result.error || 'Failed to create giveaway');
      }
    } catch (error) {
      console.error('Error creating giveaway:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate default dates
  const getDefaultDates = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
    const draw = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days from now
    
    return {
      start: start.toISOString().slice(0, 16),
      end: end.toISOString().slice(0, 16),
      draw: draw.toISOString().slice(0, 16)
    };
  };

  const defaultDates = getDefaultDates();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Quick Templates */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/30">
        <h3 className="text-2xl font-bold text-white mb-4">🚀 Quick Templates</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {prizeTemplates.map((template, index) => (
            <button
              key={index}
              onClick={() => applyTemplate(template)}
              className="group bg-black/40 hover:bg-black/60 rounded-xl p-4 text-left transition-all border border-gray-600 hover:border-purple-400"
            >
              <div className="text-2xl mb-2">{template.type === 'physical' ? '🎮' : template.type === 'cash' ? '💰' : '🪙'}</div>
              <div className="text-white font-semibold group-hover:text-purple-300 transition-colors">
                {template.name}
              </div>
              <div className="text-gray-400 text-sm mt-1">${template.value.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-2">
                {template.packages.length} packages configured
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
          🎁 Create Promotional Giveaway
        </h2>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-white font-semibold mb-2">Giveaway Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:outline-none"
              placeholder="e.g., Win a PlayStation 5!"
              required
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Prize Type *</label>
            <select
              value={formData.prize_type}
              onChange={(e) => setFormData(prev => ({ ...prev, prize_type: e.target.value as any }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:outline-none"
              required
            >
              <option value="physical">Physical Prize</option>
              <option value="cash">Cash Prize</option>
              <option value="crypto">Crypto Prize</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-white font-semibold mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:outline-none h-24"
            placeholder="Detailed description of the prize and giveaway rules..."
          />
        </div>

        {/* Prize Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-white font-semibold mb-2">Prize Value (USD) *</label>
            <input
              type="number"
              value={formData.prize_value}
              onChange={(e) => setFormData(prev => ({ ...prev, prize_value: Number(e.target.value) }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:outline-none"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Prize Description *</label>
            <input
              type="text"
              value={formData.prize_description}
              onChange={(e) => setFormData(prev => ({ ...prev, prize_description: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:outline-none"
              placeholder="e.g., PlayStation 5 Console + 2 Controllers + 3 Games"
              required
            />
          </div>
        </div>

        {/* Entry Packages */}
        <div className="bg-purple-900/30 rounded-xl p-6 border border-purple-500/30 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">📦 Entry Packages</h3>
            <button
              onClick={addPackage}
              disabled={packages.length >= 5}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              + Add Package
            </button>
          </div>
          
          <div className="space-y-4">
            {packages.map((pkg, index) => (
              <div key={pkg.id} className="bg-black/40 rounded-lg p-4 border border-gray-600">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Package Name</label>
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => updatePackage(index, 'name', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="4.99"
                      max="49.99"
                      value={pkg.price}
                      onChange={(e) => updatePackage(index, 'price', Number(e.target.value))}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Entries</label>
                    <input
                      type="number"
                      min="1"
                      value={pkg.entries}
                      onChange={(e) => updatePackage(index, 'entries', Number(e.target.value))}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={pkg.popular}
                      onChange={(e) => updatePackage(index, 'popular', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label className="text-gray-400 text-xs">Popular</label>
                  </div>
                  <div>
                    {packages.length > 1 && (
                      <button
                        onClick={() => removePackage(index)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prize Images */}
        <div className="bg-purple-900/30 rounded-xl p-6 border border-purple-500/30 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">🖼️ Prize Images (Up to 10)</h3>
            <button
              onClick={addImage}
              disabled={images.length >= 10}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              + Add Image
            </button>
          </div>
          
          <div className="space-y-3">
            {images.map((img, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="url"
                  value={img}
                  onChange={(e) => updateImage(index, e.target.value)}
                  className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-400 focus:outline-none"
                  placeholder="https://example.com/image.jpg"
                />
                {images.length > 1 && (
                  <button
                    onClick={() => removeImage(index)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-sm transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-white font-semibold mb-2">Entry Start Date *</label>
            <input
              type="datetime-local"
              value={formData.entry_start_date || defaultDates.start}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_start_date: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Entry End Date *</label>
            <input
              type="datetime-local"
              value={formData.entry_end_date || defaultDates.end}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_end_date: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Draw Date *</label>
            <input
              type="datetime-local"
              value={formData.draw_date || defaultDates.draw}
              onChange={(e) => setFormData(prev => ({ ...prev, draw_date: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center space-x-3 mb-8">
          <input
            type="checkbox"
            id="featured"
            checked={formData.is_featured}
            onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
            className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
          />
          <label htmlFor="featured" className="text-white font-semibold">
            ⭐ Feature this giveaway (shows at top)
          </label>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !publicKey}
          className="w-full bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100"
        >
          {loading ? '⏳ Creating Giveaway...' : '🎁 Create Promotional Giveaway'}
        </button>
      </div>
    </div>
  );
};

export default AdminGiveawayCreator;