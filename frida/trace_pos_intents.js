/**
 * Trace Square POS API intent handling
 *
 * Logs incoming charge/refund intents and their extras to understand
 * the internal transaction flow.
 *
 * Usage:
 *   frida -U -f com.squareup -l trace_pos_intents.js --no-pause
 */

'use strict';

function log(msg) {
  console.log('[pos-intent] ' + msg);
}

function dumpIntent(intent) {
  if (!intent) return;
  try {
    log('Action: ' + intent.getAction());
    log('Data:   ' + intent.getDataString());
    log('Flags:  ' + intent.getFlags());

    var extras = intent.getExtras();
    if (extras) {
      var keys = extras.keySet().toArray();
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i].toString();
        var val = extras.get(key);
        log('  Extra[' + key + '] = ' + val);
      }
    }
  } catch (e) {
    log('Error dumping intent: ' + e);
  }
}

Java.perform(function () {
  log('Tracing POS intent handling...');

  var POS_ACTIONS = [
    'com.squareup.pos.action.CHARGE',
    'com.squareup.pos.action.REFUND',
    'com.squareup.pos.action.OPEN'
  ];

  // Hook Activity.onCreate to catch incoming intents
  try {
    var Activity = Java.use('android.app.Activity');
    Activity.onCreate.overload('android.os.Bundle').implementation = function (bundle) {
      var intent = this.getIntent();
      if (intent) {
        var action = intent.getAction();
        if (action && POS_ACTIONS.some(function (a) { return action.indexOf(a) >= 0; })) {
          log('=== Incoming POS Intent in ' + this.getClass().getName() + ' ===');
          dumpIntent(intent);
        }
      }
      return this.onCreate(bundle);
    };
    log('Activity.onCreate hooked');
  } catch (e) {
    log('Activity hook failed: ' + e);
  }

  // Hook Intent.getStringExtra for POS keys
  try {
    var Intent = Java.use('android.content.Intent');
    Intent.getStringExtra.implementation = function (key) {
      var result = this.getStringExtra(key);
      if (key && key.indexOf('com.squareup.pos') === 0) {
        log('getStringExtra(' + key + ') = ' + result);
      }
      return result;
    };
    Intent.getIntExtra.implementation = function (key, def) {
      var result = this.getIntExtra(key, def);
      if (key && key.indexOf('com.squareup.pos') === 0) {
        log('getIntExtra(' + key + ') = ' + result);
      }
      return result;
    };
  } catch (e) {
    log('Intent extra hooks failed: ' + e);
  }
});
