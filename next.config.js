// next.config.js - Add this to your project root
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'images.unsplash.com', // For Unsplash images
      'unsplash.com',        // Alternative Unsplash domain
      'via.placeholder.com', // For placeholder images
      'picsum.photos',       // For Lorem Picsum images
      'cdn.discordapp.com',  // If you use Discord CDN
      'i.imgur.com',         // If you use Imgur
      'res.cloudinary.com',  // If you use Cloudinary
      'assets.goal.com',  // google image serach results
      'images.bauerhosting.com',// Bauer image serach results
      '9to5toys.com',//  image serach results
      'sm.pcmag.com',
      'cdn.shopify.com',
      'cdn.shopifycdn.net',
      'cdn.shopify.com',
      // Add any other image hosting domains you use
    ],
    // Alternative: Use remotePatterns for more specific control (Next.js 12.3+)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig