const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable Package Exports to properly resolve ES modules like react-i18next
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
