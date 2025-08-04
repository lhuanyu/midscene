#!/usr/bin/env node

/**
 * Complete example showing how to use iOS device mirroring with coordinate mapping and enhanced scrolling
 *
 * This example demonstrates:
 * 1. Setting up iOS device mirroring configuration
 * 2. Using coordinate transformation for accurate touch events
 * 3. Enhanced scrolling with mouse wheel/trackpad for iOS mirror compatibility
 * 4. Taking region-specific screenshots
 * 5. Automating iOS apps through macOS screen mirroring
 *
 * Key improvements:
 * - Uses mouse wheel/trackpad scrolling instead of drag for better iOS mirror compatibility
 * - Proper coordinate handling that prevents focus loss
 * - Unified scrolling method that works for both iOS mirroring and regular modes
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Load environment variables from .env file
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the package root directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Use dynamic import for TypeScript modules
let iOSDevice;
let iOSAgent;

async function loadModules() {
  try {
    const pageModule = await import('../src/page/index.ts');
    const agentModule = await import('../src/agent/index.ts');
    iOSDevice = pageModule.iOSDevice;
    iOSAgent = agentModule.iOSAgent;
  } catch (error) {
    console.error('❌ Failed to load modules. Please build the project first:');
    console.error('   npm run build');
    console.error('   Or run with tsx: npx tsx examples/ios-mirroring-demo.js');
    process.exit(1);
  }
}

async function demonstrateIOSMirroring() {
  console.log('🍎 iOS Device Mirroring Demo with Midscene.js');
  console.log('===============================================\n');

  // Load modules first
  await loadModules();

  // Step 1: Configure iOS device mirroring
  console.log('📱 Step 1: Setting up iOS device mirroring...');

  // Example configuration for iOS device mirrored via macOS screen sharing
  // {"iPhone Mirroring", {692, 161}, {344, 764}}
  const mirrorConfig = {
    mirrorX: 692, // X position of iOS mirror on macOS screen
    mirrorY: 161, // Y position of iOS mirror on macOS screen
    mirrorWidth: 344, // Width of iOS mirror on macOS screen
    mirrorHeight: 764, // Height of iOS mirror on macOS screen
  };

  const device = new iOSDevice({
    serverPort: 1412,
    iOSMirrorConfig: mirrorConfig,
  });

  try {
    console.log('🔗 Connecting to iOS device...');
    await device.connect();

    // Verify configuration
    const config = await device.getConfiguration();
    console.log('✅ iOS mirroring configured successfully!');
    console.log(
      `   🖥️  Mirror Region: (${config.config.mirror_x}, ${config.config.mirror_y}) ${config.config.mirror_width}x${config.config.mirror_height}`,
    );

    // Step 2: Initialize AI agent
    console.log('🤖 Step 2: Initializing AI agent...');
    const agent = new iOSAgent(device);
    console.log('✅ AI agent ready!\n');

    // Step 3: Demonstrate coordinate transformation
    console.log('🎯 Step 3: Testing coordinate transformation...');
    // sleep 5 seconds to allow user to make the mirror app foreground
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Test tap at various iOS coordinates
    const testPoints = [
      { left: 100, top: 200, description: 'Upper left area' },
      { left: 196, top: 426, description: 'Center of screen' },
      { left: 300, top: 700, description: 'Lower right area' },
    ];

    for (const point of testPoints) {
      console.log(
        `   📍 Tapping at iOS coordinates (${point.left}, ${point.top}) - ${point.description}`,
      );
      await device.tap(point);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Brief pause
    }
    console.log('✅ Coordinate transformation test completed!\n');

    // Step 4: Take iOS region screenshot
    console.log('📸 Step 4: Taking iOS region screenshot...');
    const screenshot = await device.screenshotBase64();
    console.log(`✅ Screenshot captured (${screenshot.length} bytes)`);
    console.log('   💾 Screenshot contains only the iOS mirrored area\n');

    // Step 5: Test enhanced scrolling functionality (now uses intelligent distance mapping)
    console.log(
      '🖱️ Step 5: Testing enhanced trackpad scrolling with intelligent distance mapping...',
    );

    console.log(
      '   🔄 Testing horizontal scroll right (300px) - should scroll horizontally to the right:',
    );
    await device.scroll({ direction: 'right', distance: 300 });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log(
      '   ⬅️ Testing horizontal scroll left (300px) - should scroll horizontally to the left:',
    );
    await device.scroll({ direction: 'left', distance: 300 });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('✅ Enhanced horizontal scrolling test completed!\n');

    // Step 6: Demonstrate AI automation
    console.log('🧠 Step 6: AI automation example...');
    console.log('   (This would work with actual iOS app content)');

    // Example AI operations (commented out as they need actual iOS app content)
    await agent.aiTap('Settings app icon');
    await agent.ai('返回主屏幕');
    // await agent.ai("在 显示与亮度中 开启深色模式")

    console.log('✅ Demo completed successfully!\n');

    // Step 7: Show usage summary
    console.log('📋 Usage Summary:');
    console.log('================');
    console.log(
      '• iOS coordinates are automatically transformed to macOS coordinates',
    );
    console.log('• Screenshots capture only the iOS mirrored region');
    console.log(
      '• Scrolling now uses intelligent distance mapping for better Android compatibility',
    );
    console.log(
      '• Distance values (e.g., 200px) are automatically converted to appropriate scroll events',
    );
    console.log(
      '• Trackpad scrolling by default provides smooth, natural iOS experience',
    );
    console.log('• Mouse wheel scrolling available as fallback option');
    console.log('• All Midscene AI features work with iOS device mirroring');
    console.log('• Perfect for testing iOS apps through screen mirroring');
    console.log(
      '• Coordinate system is unified: use iOS logical coordinates everywhere\n',
    );
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error(
      '• Ensure Python server is running: python3 auto_server.py 1412',
    );
    console.error('• Check iOS device is properly mirrored on macOS screen');
    console.error('• Verify mirror coordinates match actual screen position');
    console.error('• Install required dependencies: flask, pyautogui');
    process.exit(1);
  }
}

// Additional utility functions for iOS mirroring setup
async function detectIOSMirrorRegion() {
  console.log('🔍 iOS Mirror Region Detection Helper');
  console.log('====================================');
  console.log(
    'Use this function to help detect iOS mirror coordinates on your screen:',
  );
  console.log('1. Open iOS device in screen mirroring/QuickTime/Simulator');
  console.log('2. Note the position and size of the iOS window');
  console.log('3. Update mirrorConfig with these values');
  console.log('4. Test with small tap operations first');

  // This could be enhanced with screen capture analysis
  // to automatically detect iOS mirror regions
}

function calculateMirrorInfo(mirrorWidth, mirrorHeight) {
  // Common iOS device aspect ratios for reference
  const commonRatios = [
    { name: 'iPhone 15 Pro', width: 393, height: 852 },
    { name: 'iPhone 12/13/14', width: 390, height: 844 },
    { name: 'iPhone 11 Pro Max', width: 414, height: 896 },
    { name: 'iPhone X/XS', width: 375, height: 812 },
  ];

  const mirrorRatio = mirrorHeight / mirrorWidth;

  console.log('📐 Mirror Information:');
  console.log(`   Mirror Size: ${mirrorWidth}x${mirrorHeight}`);
  console.log(`   Aspect Ratio: ${mirrorRatio.toFixed(3)}`);

  // Find closest matching iOS device
  const closest = commonRatios.reduce((prev, curr) => {
    const prevRatio = prev.height / prev.width;
    const currRatio = curr.height / curr.width;
    return Math.abs(currRatio - mirrorRatio) < Math.abs(prevRatio - mirrorRatio)
      ? curr
      : prev;
  });

  console.log(
    `   Closest iOS device: ${closest.name} (${closest.width}x${closest.height})`,
  );

  return { mirrorWidth, mirrorHeight, suggestedDevice: closest };
}

// Check if this file is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  demonstrateIOSMirroring().catch(console.error);
}
