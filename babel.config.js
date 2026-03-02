module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // This line is required for animations to work
      'react-native-reanimated/plugin', 
    ],
  };
};