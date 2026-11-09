// Expo config plugin: builds every CocoaPods target in Swift 5 mode with strict-concurrency checking "minimal".
// (Swift 6 language mode is what reports "sending ... risks causing data races" as an error.)
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
        bc.build_settings['SWIFT_VERSION'] = '5.0'
        // The archive compiles Swift with -Werror; this diagnostic is a warning that becomes an error, so keep warnings as warnings.
        bc.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      end
    end`;
    c.modResults.contents = s.replace(HOOK, m => m + block);
    return c;
  });
