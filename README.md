# otel-json-logger
JSON diagnose logger for OpenTelemetry

## Installation

```sh
npm install --save @dreamit/otel-json-logger
```

TypeScript declarations are provided within the project.

## Compatibility

**otel-json-logger** is compatible with [@opentelemetry/api][1] version ^1.6.0.


## Features

- Provides JSON Logger for OpenTelemetry **DiagLogger** interface
  
## Usage

Create a **JsonDiagLogger** object by providing a fitting logger name and service name. You can additionally add a thrid parameter to define whether debug is enabled or not.

```typescript
import {JsonDiagLogger} from '@dreamit/otel-json-logger'
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

// Standalone
const logger=  new JsonDiagLogger('test-logger', 'test-service')
logger.debug('test', 1, {name: 'myname'})

// Add as global DiagLogger
diag.setLogger(logger, DiagLogLevel.ERROR)
```

## Contact

If you have questions or issues please visit our [Issue page](https://github.com/dreamit-de/otel-json-logger/issues)
and open a new issue if there are no fitting issues for your topic yet.


## License

graphql-server is under [MIT-License](./LICENSE).

[1]: https://github.com/open-telemetry/opentelemetry-js
