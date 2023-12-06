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
- Stringifies/inspects messages with objects and arrays as well as log arguments to avoid breaking logging tools
- Creates ISODate timestamp for log entry
  
## Usage

Create a **JsonDiagLogger** object by providing a fitting *loggerName* and *serviceName*. The logger can be used standalone to log JSON to console as well as
a global *DiagLogger*. 

```typescript
import { JsonDiagLogger } from '@dreamit/otel-json-logger'
import { diag, DiagLogLevel } from "@opentelemetry/api";

// Standalone
const logger = new JsonDiagLogger({
    loggerName: 'test-logger', // The loggerName printed in field "logger"
    serviceName: 'test-service', // The serviceName printed in field "serviceName"
    logFirstIncomingRequest: true, // Optional: The first incoming request will be logged. Other messages on debug level will be ignored. Default: false. Note: If you use diag.setLogger ensure that at least "LogLevel.debug" is set, otherwise the message will be ignored. 
    logLevelForServiceRequestErrorMessages: LogLevel.info, // Optional: The log level to use for error message "Service request". These contain request information that might not be logged on error level.
    logLevelForTimeoutErrorMessages: LogLevel.info, // Optional: The log level to use for Timeout related messages. These might be of short nature and be downgraded or ignored.
    logLevelForVerbose: LogLevel.off // Optional: Set LogLevel for verbose entries or ignore them
    truncateLimit: 200 // Optional:  The length of the message before the message gets truncated. Default: undefined/0 (off). 
    truncatedText: '_TRC_' // Optional: The text to display if a message is truncated.
})
logger.debug('test', 1, {name: 'myname'})

// Add as global DiagLogger
diag.setLogger(logger, DiagLogLevel.ERROR)
```

## JsonDiagLogger functions

### General functions
* **createLogEntry**: Creates and returns a log entry of type **LogEntry** with the provided information.
* **logMessage**: Central function being called by all **DiagLogger** interface functions. Calls **createLogEntry**, stringifies the result and calls **console.log()**.
* **formatMessage**: Formats the message. If the message contains an object or array wrap it in JSON.stringify to avoid these being interpreted as JSON objects.
* **setOptions**: Sets the **LoggerOptions** to be used for logging. Can be called after constructor call to set new/other options.
* **containsTimeout**: Check if the message contains a Timeout information like "4 DEADLINE_EXCEEDED" or "14 UNAVAILABLE"
* **isIncomingRequestLogMessage**: Checks if the arguments are part of an incomingRequest message, i.e. the first argument contains the text 'incomingRequest'

### DiagLogger interface functions
* **debug**: Logs a debug message
* **error**: Logs an error message
* **info**: Logs an info message
* **verbose**: Logs a warn message
* **warn**: Logs a verbose message

### LogLevel enum values
* **DEBUG**
* **ERROR**
* **INFO**
* **OFF** : Do not log these entries!
* **VERBOSE**
* **WARN**

## Contact

If you have questions or issues please visit our [Issue page](https://github.com/dreamit-de/otel-json-logger/issues)
and open a new issue if there are no fitting issues for your topic yet.


## License

otel-json-logger is under [MIT-License](./LICENSE).

[1]: https://github.com/open-telemetry/opentelemetry-js
