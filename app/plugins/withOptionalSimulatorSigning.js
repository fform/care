const { withEntitlementsPlist } = require('@expo/config-plugins');

// Strips Sign in with Apple when EXPO_IOS_SIMULATOR_NO_APPLE_SIGNIN=1 (see app.config.ts).
module.exports = function withOptionalSimulatorSigning(config) {
  if (process.env.EXPO_IOS_SIMULATOR_NO_APPLE_SIGNIN !== '1') {
    return config;
  }
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['com.apple.developer.applesignin'];
    return cfg;
  });
}
