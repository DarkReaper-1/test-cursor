# Square POS Intent API Reference

Documented public API surface for interacting with the Square Point of Sale Android app. This is the primary externally-visible interface that reverse engineers should map to internal handlers.

> Source: [Square Developer Documentation — POS API](https://developer.squareup.com/docs/pos-api/build-on-android)

## Authentication

Square POS authenticates calling apps using:

1. **Package name** — e.g., `com.example.myapp`
2. **SHA-1 certificate fingerprint** — of the signing certificate

Both must be registered in the [Square Developer Console](https://developer.squareup.com/apps) under **Point of Sale API → Android**.

## Android 11+ Manifest Requirement

Calling apps must declare a `<queries>` element:

```xml
<queries>
    <package android:name="com.squareup" />
</queries>
```

## Intent Actions

| Action | Purpose |
|--------|---------|
| `com.squareup.pos.action.CHARGE` | Initiate a payment transaction |
| `com.squareup.pos.action.REFUND` | Initiate a refund |
| `com.squareup.pos.action.OPEN` | Open Square POS app |

## Charge Intent (Android)

### Java (POS SDK 2.0)

```java
import com.squareup.sdk.pos.ChargeRequest;
import com.squareup.sdk.pos.CurrencyCode;
import com.squareup.sdk.pos.PosClient;

ChargeRequest request = new ChargeRequest.Builder(
    100,                              // amount in cents ($1.00)
    CurrencyCode.USD
)
    .note("Test transaction")
    .build();

Intent intent = posClient.createChargeIntent(request);
startActivityForResult(intent, REQUEST_CODE);
```

### Raw Intent (no SDK)

```java
Intent intent = new Intent("com.squareup.pos.action.CHARGE");
intent.setPackage("com.squareup");
intent.putExtra("com.squareup.pos.TOTAL_AMOUNT", 100);
intent.putExtra("com.squareup.pos.CURRENCY_CODE", "USD");
intent.putExtra("com.squareup.pos.API_VERSION", "v2.0");
intent.putExtra("com.squareup.pos.TENDER_TYPES",
    "com.squareup.pos.TENDER_CARD,com.squareup.pos.TENDER_CASH");
startActivityForResult(intent, REQUEST_CODE);
```

### Web Intent URL (Android)

```html
<a href="intent:#Intent;
    action=com.squareup.pos.action.CHARGE;
    package=com.squareup;
    S.com.squareup.pos.API_VERSION=v2.0;
    i.com.squareup.pos.TOTAL_AMOUNT=100;
    S.com.squareup.pos.CURRENCY_CODE=USD;
    S.com.squareup.pos.TENDER_TYPES=com.squareup.pos.TENDER_CARD;
    end">Pay $1.00</a>
```

## Intent Extras

| Extra Key | Type | Required | Description |
|-----------|------|----------|-------------|
| `com.squareup.pos.TOTAL_AMOUNT` | int | Yes | Amount in smallest currency unit (cents) |
| `com.squareup.pos.CURRENCY_CODE` | String | Yes | ISO 4217 code (e.g., `USD`) |
| `com.squareup.pos.API_VERSION` | String | Yes | API version (e.g., `v2.0`) |
| `com.squareup.pos.TENDER_TYPES` | String | Yes | Comma-separated tender types |
| `com.squareup.pos.NOTE` | String | No | Transaction note |
| `com.squareup.pos.CUSTOMER_ID` | String | No | Square customer ID |
| `com.squareup.pos.SKIP_RECEIPT` | boolean | No | Skip receipt screen |
| `com.squareup.pos.AUTO_RETURN` | boolean | No | Auto-return to calling app |
| `com.squareup.pos.CLIENT_ID` | String | Web only | Square application ID |
| `com.squareup.pos.WEB_CALLBACK_URI` | String | Web only | Callback URL after transaction |
| `com.squareup.pos.AUTO_RETURN_TIMEOUT` | int | No | Timeout in ms for auto-return |

## Tender Types

| Value | Description |
|-------|-------------|
| `com.squareup.pos.TENDER_CARD` | Credit/debit card |
| `com.squareup.pos.TENDER_CASH` | Cash payment |
| `com.squareup.pos.TENDER_OTHER` | Custom tender type |

## Response Handling

Parse the result in `onActivityResult`:

```java
@Override
protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (resultCode == RESULT_OK) {
        // Success — parse transaction details from data Intent
        String txnId = data.getStringExtra("com.squareup.pos.SERVER_TRANSACTION_ID");
        String clientTxnId = data.getStringExtra("com.squareup.pos.CLIENT_TRANSACTION_ID");
    } else if (resultCode == RESULT_CANCELED) {
        // User canceled or error
        String errorCode = data.getStringExtra("com.squareup.pos.ERROR_CODE");
    }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `TRANSACTION_ALREADY_IN_PROGRESS` | Another transaction is active |
| `UNSUPPORTED_API_VERSION` | API version mismatch |
| `INVALID_REQUEST` | Malformed intent extras |
| `UNAUTHORIZED` | Caller not registered in Developer Console |

## Reverse Engineering Targets

When analyzing `com.squareup`, search for these entry points:

```
# Intent filter registration
com.squareup.pos.action.CHARGE
com.squareup.pos.action.REFUND

# Internal handler classes (names will be obfuscated)
*ChargeActivity*
*PosActivity*
*TransactionActivity*

# Authentication validation
*Fingerprint*
*PackageValidator*
*CallerAuth*

# Response construction
SERVER_TRANSACTION_ID
CLIENT_TRANSACTION_ID
ERROR_CODE
```

Use `frida/trace_pos_intents.js` to log intent extras at runtime when triggering transactions from a test app.

## POS SDK Package Structure

The open-source POS SDK (for calling apps, not the Square app itself):

```
com.squareup.sdk.pos
├── PosClient              — Main interface
├── ChargeRequest          — Transaction request builder
├── ChargeRequest.Builder  — Fluent builder
├── CurrencyCode           — ISO 4217 enum
└── ChargeRequest.TenderType — Payment method enum
```

The Square POS app (`com.squareup`) contains the **receiver** side of this API — the code that validates, processes, and responds to these intents.
