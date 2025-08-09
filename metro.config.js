// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Anda dapat menambahkan konfigurasi kustom di sini NANTI,
// setelah build berhasil dengan konfigurasi dasar.
// Pastikan konfigurasi kustom tersebut kompatibel dengan SDK 49.

module.exports = config;