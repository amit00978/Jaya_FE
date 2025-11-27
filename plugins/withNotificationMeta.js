const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to ensure the Firebase default_notification_color meta-data
 * has tools:replace="android:resource" so it overrides other libraries.
 */
module.exports = function withNotificationMeta(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    // ensure tools namespace is present on manifest root
    if (!manifest.$) manifest.$ = {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    // ensure application node exists
    if (!manifest.manifest || !manifest.manifest.application) {
      return config;
    }

    const application = manifest.manifest.application[0];
    if (!application['meta-data']) application['meta-data'] = [];

    // remove any existing entry with same name to avoid duplicates
    application['meta-data'] = application['meta-data'].filter((md) => {
      return !(md.$ && md.$['android:name'] === 'com.google.firebase.messaging.default_notification_color');
    });

    // add meta-data with tools:replace to force resource override
    application['meta-data'].push({
      $: {
        'android:name': 'com.google.firebase.messaging.default_notification_color',
        'android:resource': '@color/white',
        'tools:replace': 'android:resource'
      }
    });

    config.modResults = manifest;
    return config;
  });
};
