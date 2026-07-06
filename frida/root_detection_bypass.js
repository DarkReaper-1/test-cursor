/**
 * Root / integrity detection bypass for Square Android apps
 *
 * Square POS may refuse transactions when Developer Options or root
 * are detected. This script hooks common detection patterns.
 *
 * Usage:
 *   frida -U -f com.squareup -l root_detection_bypass.js --no-pause
 */

'use strict';

function log(msg) {
  console.log('[root-bypass] ' + msg);
}

Java.perform(function () {
  log('Hooking root/integrity detection...');

  // Generic: hook methods returning boolean with "root" in name
  Java.enumerateLoadedClasses({
    onMatch: function (className) {
      if (!/square/i.test(className)) return;

      try {
        var clazz = Java.use(className);
        var methods = clazz.class.getDeclaredMethods();
        methods.forEach(function (method) {
          var name = method.getName();
          if (/root|integrity|debug|emulator|tamper/i.test(name) &&
              method.getReturnType().getName() === 'boolean') {
            try {
              clazz[name].overloads.forEach(function (overload) {
                overload.implementation = function () {
                  log(className + '.' + name + ' -> false');
                  return false;
                };
              });
            } catch (_) {}
          }
        });
      } catch (_) {}
    },
    onComplete: function () {
      log('Square class scan complete');
    }
  });

  // RootBeer library (common third-party root checker)
  try {
    var RootBeer = Java.use('com.scottyab.rootbeer.RootBeer');
    RootBeer.isRooted.implementation = function () {
      log('RootBeer.isRooted -> false');
      return false;
    };
    RootBeer.isRootedWithoutBusyBoxCheck.implementation = function () {
      return false;
    };
  } catch (_) {}

  // File.exists checks for su binary
  try {
    var File = Java.use('java.io.File');
    File.exists.implementation = function () {
      var path = this.getAbsolutePath();
      if (/\/su$|\/su\/|magisk|supersu|busybox/i.test(path)) {
        log('File.exists blocked: ' + path);
        return false;
      }
      return this.exists.call(this);
    };
  } catch (e) {
    log('File.exists hook failed: ' + e);
  }

  // Settings.Global — developer options
  try {
    var SettingsGlobal = Java.use('android.provider.Settings$Global');
    SettingsGlobal.getInt.overload('android.content.ContentResolver', 'java.lang.String', 'int')
      .implementation = function (resolver, name, def) {
        if (/development_settings_enabled|adb_enabled/i.test(name)) {
          log('Settings.Global.getInt blocked: ' + name);
          return 0;
        }
        return this.getInt(resolver, name, def);
      };
  } catch (_) {}

  // SystemProperties
  try {
    var SystemProperties = Java.use('android.os.SystemProperties');
    SystemProperties.get.overload('java.lang.String').implementation = function (key) {
      if (/ro\.debuggable|ro\.secure|ro\.build\.tags/i.test(key)) {
        log('SystemProperties.get blocked: ' + key);
        if (key === 'ro.build.tags') return 'release-keys';
        if (key === 'ro.debuggable') return '0';
        if (key === 'ro.secure') return '1';
      }
      return this.get(key);
    };
  } catch (_) {}

  log('Root detection bypass active');
});
