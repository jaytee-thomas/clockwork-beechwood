const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create a simple SVG icon with Beechwood colors
const createSVGIcon = (size) => {
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#a18072" rx="${size * 0.15}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.4}" 
        font-weight="bold" 
        fill="#f2e8e5" 
        text-anchor="middle" 
        dominant-baseline="central"
      >SM</text>
    </svg>
  `;
};

async function generateIcons() {
  console.log('Generating app icons...\n');

  // Check if source icon exists
  const sourceIconPaths = [
    path.join(__dirname, '..', 'icon.png'),
    path.join(__dirname, '..', 'icon.svg'),
    path.join(publicDir, 'icon.png'),
    path.join(publicDir, 'icon.svg'),
  ];

  let sourceIconPath = null;
  for (const sourcePath of sourceIconPaths) {
    if (fs.existsSync(sourcePath)) {
      sourceIconPath = sourcePath;
      console.log(`Found source icon: ${sourcePath}`);
      break;
    }
  }

  // Generate icons for each size
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    
    try {
      if (sourceIconPath) {
        // Resize existing icon
        await sharp(sourceIconPath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 161, g: 128, b: 114, alpha: 1 } // #a18072
          })
          .png()
          .toFile(outputPath);
      } else {
        // Create placeholder icon from SVG
        const svgBuffer = Buffer.from(createSVGIcon(size));
        await sharp(svgBuffer)
          .png()
          .toFile(outputPath);
      }
      
      console.log(`✓ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log('\n✅ Icon generation complete!');
  if (!sourceIconPath) {
    console.log('\n💡 Tip: Add an icon.png or icon.svg file to the project root');
    console.log('   or public/ directory to use a custom icon instead of the placeholder.');
  }
}

generateIcons().catch(console.error);

