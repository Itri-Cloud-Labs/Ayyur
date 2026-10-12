const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// inlineRem 16 keeps Tailwind spacing on a 4px grid (NativeWind defaults to 14).
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
