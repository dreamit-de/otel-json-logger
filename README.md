# otel-json-logger
JSON diagnose logger for OpenTelemetry

## Installation

```sh
npm install --save @dreamit/graphql-prom-metrics
```

TypeScript declarations are provided within the project.

## Compatibility

**graphql-prom-metrics** is compatible with [@dreamit/graphql-server][1] version ^3.2.1 and [prom-client][2] version ^14.0.1.


## Features

- Provides out-of-the-box metrics for GraphQLServer
- Provides 3 custom as well as NodeJS related metrics.
- Uses only 2 peerDependencies: [@dreamit/graphql-server][1] version 3 and [prom-client][2] version 14 (no other production
  dependencies)

  
## Metrics

The **PromMetricsClient** uses [prom-client][2] library to provide NodeJS metrics like cpu and memory usage as well as GraphQLServer related metrics.

**Warning!**:
If you are using **PromMetricsClient** you should avoid creating multiple **GraphQLServer** instances that all use the **PromMetricsClient**. Because of the usage of a global object in the [prom-client][2] library this might result in unexpected behaviour or malfunction. You can set another metrics client like **SimpleMetricsClient** by calling **GraphQLServer setOptions()** or **GraphQLServer setMetricsClient()**.   

The **PromMetricsClient** provides three custom metrics for the GraphQL server:

- **graphql_server_availability**: Availability gauge with status 0 (unavailable) and 1 (available)
- **graphql_server_request_throughput**: The number of incoming requests
- **graphql_server_errors**: The number of errors that are encountered while running the GraphQLServer. The counter uses
  the *errorName* field as label so errors could be differentiated. At the moment the following labels are available and
  initialized with 0:
    - FetchError
    - GraphQLError
    - SchemaValidationError
    - MethodNotAllowedError
    - InvalidSchemaError
    - MissingQueryParameterError
    - ValidationError
    - SyntaxError
    - IntrospectionDisabledError

A simple metrics endpoint can be created by using `getMetricsContentType` and `getMetrics` functions from
the `GraphQLServer` instance. In the example below a second route is used to return metrics data.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema, metricsClient: new PromMetricsClient()})
graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequestAndSendResponse(req, res)
})
graphQLServerExpress.get('/metrics', async(req, res) => {
    return res.contentType(customGraphQLServer.getMetricsContentType())
        .send(await customGraphQLServer.getMetrics());
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```


## Contact

If you have questions or issues please visit our [Issue page](https://github.com/dreamit-de/graphql-prom-metrics/issues)
and open a new issue if there are no fitting issues for your topic yet.


## License

graphql-server is under [MIT-License](./LICENSE).

[1]: https://github.com/dreamit-de/graphql-server

[2]:  https://github.com/siimon/prom-client
