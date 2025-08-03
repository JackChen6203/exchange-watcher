PS C:\Users\solidityDeveloper\crypto-exchange-monitor ( | 139 changes)
> npm start

> crypto-exchange-monitor@1.0.0 start
> node src/index.js

C:\Users\solidityDeveloper\crypto-exchange-monitor\src\services\bitgetMonitor.js:361
          await this.db.savePriceData(priceData);
          ^^^^^

SyntaxError: await is only valid in async functions and the top level bodies of modules
    at wrapSafe (node:internal/modules/cjs/loader:1666:18)
    at Module._compile (node:internal/modules/cjs/loader:1708:20)
    at Object..js (node:internal/modules/cjs/loader:1899:10)
    at Module.load (node:internal/modules/cjs/loader:1469:32)
    at Module._load (node:internal/modules/cjs/loader:1286:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
    at Module.require (node:internal/modules/cjs/loader:1491:12)
    at require (node:internal/modules/helpers:135:16)
    at Object.<anonymous> (C:\Users\solidityDeveloper\crypto-exchange-monitor\src\index.js:3:23)

Node.js v24.0.2