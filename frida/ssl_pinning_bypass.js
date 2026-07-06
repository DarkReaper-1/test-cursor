/**
 * SSL certificate pinning bypass for Square Android apps
 *
 * Usage:
 *   frida -U -f com.squareup -l ssl_pinning_bypass.js --no-pause
 *   frida -U com.squareup -l ssl_pinning_bypass.js
 *
 * Targets OkHttp CertificatePinner and common TrustManager implementations.
 */

'use strict';

function log(msg) {
  console.log('[ssl-bypass] ' + msg);
}

Java.perform(function () {
  log('Hooking SSL pinning...');

  // OkHttp3 CertificatePinner.check
  try {
    var CertificatePinner = Java.use('okhttp3.CertificatePinner');
    CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function (hostname, peerCertificates) {
      log('CertificatePinner.check bypassed for: ' + hostname);
    };
    CertificatePinner.check.overload('java.lang.String', '[Ljava.security.cert.Certificate;').implementation = function (hostname, certs) {
      log('CertificatePinner.check (certs) bypassed for: ' + hostname);
    };
    log('OkHttp CertificatePinner hooked');
  } catch (e) {
    log('OkHttp CertificatePinner not found: ' + e);
  }

  // TrustManagerImpl (Android)
  try {
    var TrustManagerImpl = Java.use('com.android.org.conscrypt.TrustManagerImpl');
    TrustManagerImpl.verifyChain.implementation = function (untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
      log('TrustManagerImpl.verifyChain bypassed for: ' + host);
      return untrustedChain;
    };
    log('TrustManagerImpl hooked');
  } catch (e) {
    log('TrustManagerImpl not found: ' + e);
  }

  // X509TrustManager — accept all (fallback)
  try {
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var TrustManagers = Java.registerClass({
      name: 'com.square.re.TrustAllManager',
      implements: [X509TrustManager],
      methods: {
        checkClientTrusted: function (chain, authType) {},
        checkServerTrusted: function (chain, authType) {},
        getAcceptedIssuers: function () { return []; }
      }
    });

    var SSLContext = Java.use('javax.net.ssl.SSLContext');
    var TrustAll = [TrustManagers.$new()];
    var sc = SSLContext.getInstance('TLS');
    sc.init(null, TrustAll, null);
    SSLContext.setDefault(sc);
    log('Global TrustAll SSLContext installed');
  } catch (e) {
    log('X509TrustManager fallback failed: ' + e);
  }
});
