// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Jika Anda memiliki konfigurasi khusus, tambahkan di sini.
// Pastikan itu kompatibel dengan SDK 49.
// Contoh:
// config.resolver.assetExts.push('db');

module.exports = config;