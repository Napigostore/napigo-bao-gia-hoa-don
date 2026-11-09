// Expo config plugin: builds every CocoaPods target with Swift strict-concurrency checking set to "minimal".
// Xcode 26.3 turns expo-modules-jsi's Swift data-race diagnostic ("sending 'slot' risks causing data races")
// into an error, which fails the archive on CI. This only changes the generated Podfile during prebuild.
const { withPodfile } = require('expo/config-plugins');

const MARK = '# with-swift-concurrency';
const HOOK = /post_install do \|installer\|/;

module.exports = config =>
  withPodfile(config, c => {
    let s = c.modResults.contents;
    if (s.includes(MARK)) return c;
    if (!HOOK.test(s)) throw new Error('with-swift-concurrency: post_install block not found in the Podfile');
    const block = `
    ${MARK}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      end
    end`;
    c.modResults.contents = s.replace(HOOK, m => m + block);
    return c;
  });
