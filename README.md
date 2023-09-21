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
- Stringifies log arguments to avoid breaking logging tools
- Create ISODate timestamp for log entry
  
## Usage

Create a **JsonDiagLogger** object by providing a fitting *loggerName* and *serviceName*. The logger can be used standalone to log JSON to console as well as
a global *DiagLogger*. 

```typescript
import { JsonDiagLogger } from '@dreamit/otel-json-logger'
import { diag, DiagLogLevel } from "@opentelemetry/api";

// Standalone
const logger = new JsonDiagLogger({
    loggerName: 'test-logger', 
    serviceName: 'test-service'
})
logger.debug('test', 1, {name: 'myname'})

// Add as global DiagLogger
diag.setLogger(logger, DiagLogLevel.ERROR)
```

## JsonDiagLogger functions

### General functions
* **createLogEntry**: Creates and returns a log entry of type **LogEntry** with the provided information.
* **logMessage**: Central function being called by all **DiagLogger** interface functions. Calls **createLogEntry**, stringifies the result and calls **console.log()**.

### DiagLogger interface functions
* **debug**: Logs a debug message
* **error**: Logs an error message
* **info**: Logs an info message
* **verbose**: Logs a warn message
* **warn**: Logs a verbose message

## Contact

If you have questions or issues please visit our [Issue page](https://github.com/dreamit-de/otel-json-logger/issues)
and open a new issue if there are no fitting issues for your topic yet.


## License

otel-json-logger is under [MIT-License](./LICENSE).

[1]: https://github.com/open-telemetry/opentelemetry-js
