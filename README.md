# Probe It

Execute system commands or probe HTTP URLs and [AWS](https://aws.amazon.com)
[S3](https://aws.amazon.com/s3/) buckets to produce metrics in JSON or for
[Prometheus](https://prometheus.io). Can be used on the command line or as a
server.

Inspired by [Prometheus Blackbox
Exporter](https://github.com/prometheus/blackbox_exporter).

[![npm version](https://badge.fury.io/js/probeit.svg)](https://badge.fury.io/js/probeit)
[![license](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Usage](#usage)
  - [Installation](#installation)
- [Metrics](#metrics)
  - [Prometheus format](#prometheus-format)
  - [Generic metrics](#generic-metrics)
    - [`duration`](#duration)
- [Command probe](#command-probe)
  - [System commands](#system-commands)
    - [System command metrics](#system-command-metrics)
    - [`commandExitCode`](#commandexitcode)
- [HTTP probe](#http-probe)
  - [HTTP probe metrics](#http-probe-metrics)
    - [`httpCertificateExpiry`](#httpcertificateexpiry)
    - [`httpContentLength`](#httpcontentlength)
    - [`httpDuration`](#httpduration)
    - [`httpRedirects`](#httpredirects)
    - [`httpSecure`](#httpsecure)
    - [`httpStatusCode`](#httpstatuscode)
    - [`httpVersion`](#httpversion)
  - [HTTP probe parameters](#http-probe-parameters)
    - [`allowUnauthorized`](#allowunauthorized)
    - [`followRedirects`](#followredirects)
    - [`header`](#header)
    - [`method`](#method)
  - [HTTP probe expectations](#http-probe-expectations)
    - [`expectHttpRedirects`](#expecthttpredirects)
    - [`expectHttpRedirectTo`](#expecthttpredirectto)
    - [`expectHttpResponseBodyMatch`](#expecthttpresponsebodymatch)
    - [`expectHttpResponseBodyMismatch`](#expecthttpresponsebodymismatch)
    - [`expectHttpSecure`](#expecthttpsecure)
    - [`expectHttpStatusCode`](#expecthttpstatuscode)
    - [`expectHttpVersion`](#expecthttpversion)
  - [HTTP probe failures](#http-probe-failures)
    - [`httpResponseBodyMismatch`](#httpresponsebodymismatch)
    - [`insecureHttp`](#insecurehttp)
    - [`invalidHttpRedirectCount`](#invalidhttpredirectcount)
    - [`invalidHttpRedirectLocation`](#invalidhttpredirectlocation)
    - [`invalidHttpStatusCode`](#invalidhttpstatuscode)
    - [`invalidHttpVersion`](#invalidhttpversion)
    - [`missingHttpRedirect`](#missinghttpredirect)
    - [`unexpectedHttpRedirect`](#unexpectedhttpredirect)
    - [`unexpectedHttpResponseBodyMatch`](#unexpectedhttpresponsebodymatch)
    - [`unexpectedlySecureHttp`](#unexpectedlysecurehttp)
- [S3 probe](#s3-probe)
  - [S3 probe metrics](#s3-probe-metrics)
    - [`s3FirstObjectModificationDate`](#s3firstobjectmodificationdate)
    - [`s3FirstObjectVersionModificationDate`](#s3firstobjectversionmodificationdate)
    - [`s3LargestObjectSize`](#s3largestobjectsize)
    - [`s3LastObjectModificationDate`](#s3lastobjectmodificationdate)
    - [`s3LastObjectVersionModificationDate`](#s3lastobjectversionmodificationdate)
    - [`s3ObjectsCount`](#s3objectscount)
    - [`s3ObjectsTotalSize`](#s3objectstotalsize)
    - [`s3ObjectVersionsCount`](#s3objectversionscount)
    - [`s3SmallestObjectSize`](#s3smallestobjectsize)
  - [S3 probe parameters](#s3-probe-parameters)
    - [`s3ByPrefix`](#s3byprefix)
    - [`s3Versions`](#s3versions)
- [Versioning policy](#versioning-policy)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



## Usage

Visit
[http://probeit.herokuapp.com/?target=http://google.com&pretty=true](http://probeit.herokuapp.com/?target=http://google.com&pretty=true)
for a sample probe of an HTTP endpoint.

The `target` query parameter indicates what to probe:

* An HTTP(S) endpoint, e.g. `https://google.com`, to use the [HTTP
  probe](#http-probe)
* An S3 bucket URL, e.g. `s3://bucket_name`, to use the [S3 probe](#s3-probe)

The response will be a JSON object with:

* A `success` boolean property indicating whether the probe was successful.
* A `metrics` array of objects, describing various metrics collected from the
  probed target, such as duration of the probe, HTTP status code, number of S3
  objects, etc.
* A `failures` array which may indicate possible causes of the probe's failure.

```json
{
  "failures": [],
  "metrics": [
    {
      "description": "How long the probe took to complete in seconds",
      "name": "duration",
      "tags": {},
      "type": "seconds",
      "value": 0.12
    },
    ...
  ],
  "success": true
}
```



### Installation

**Run it with [Docker](https://www.docker.com)**

```bash
docker run -p 3000:3000 alphahydrae/probeit
```

**Or, run it with [npx](https://github.com/zkat/npx)**

```bash
npx probeit
```

**Or, install and run it manually**

```bash
npm install -g probeit
probeit
```

**Then, try it**

Visit [http://localhost:3000?target=http://google.com&pretty=true](http://localhost:3000?target=http://google.com&pretty=true)



## Metrics

The server's probes provide various metrics about their target, mostly numeric
values such as counts, bytesizes, last modification dates, etc.

Each metric is a JSON object with the following format:

```json
{
  "description": "What I am",
  "name": "myName",
  "tags": {
    "meta": "data"
  },
  "type": "seconds",
  "value": 1.2
}
```

The following metric types exist at this time:

* **boolean** - `true` or `false`.
* **bytes** - Integer greater than or equal to zero.
* **datetime** - Date in ISO-8601 format.
* **number** - Number with no associated unit of measurement.
* **quantity** - Integer greater than or equal to zero, representing an amount
  of something.
* **seconds** - Number greater than or equal to zero.

The **value of a metric may be `null`** if it cannot be determined (e.g. the
[`httpCertificateExpiry` metric](#httpcertificateexpiry) can be `null` if the
HTTP request is not made over TLS, or the [`s3LastObjectModificationDate`
metric](#s3lastobjectmodificationdate) can be `null` if the S3 bucket contains
no objects).



### Prometheus format

To get the metrics in [Prometheus](https://prometheus.io)'s text format, use the `/metrics` path:

[http://probeit.herokuapp.com/metrics?target=http://google.com](http://probeit.herokuapp.com/metrics?target=http://google.com)

Metric names are converted from the JSON's camel-case format to **underscored
format** and the **`probe_` prefix** is prepended (e.g.  `httpStatusCode`
becomes `probe_http_status_code`). Additionally, the metric's **type is added as
a suffix** if it's `bytes` or `seconds` (e.g. `duration` becomes
`probe_duration_seconds`).

Metric tags are added as labels.

All metrics will be provided as
[gauges](https://prometheus.io/docs/concepts/metric_types/#gauge) by applying
the following conversions by type:

* **boolean** - `true` becomes `1` and `false` becomes `0`.
* **bytes** - No conversion, except for `null` which becomes `-1`.
* **datetime** - Dates are provided in [Unix
  time](https://en.wikipedia.org/wiki/Unix_time), i.e. the number of seconds
  that have elapsed since 00:00:00 UTC on Thursday, 1 January 1970. `null`
  becomes `-1`.
* **number** - No conversion, except for `null` which becomes `NaN`.
* **quantity** - No conversion, except for `null` which becomes `-1`.
* **seconds** - No conversion, except for `null` which becomes `-1`.



### Generic metrics

The following sub-headings document metrics that are provided by all probes.



#### `duration`

**Type:** seconds

How long the probe took to complete in seconds.

```json
{
  "description": "...",
  "name": "duration",
  "tags": {},
  "type": "seconds",
  "value": 0.12
}
```



## Command probe

The command probe is used when the target is an URI that starts with `command:`,
e.g. `command:foo`. This will execute the command named `foo` and return its
metrics.

Named commands must be pre-defined with the `commands` property of Probe It's
configuration file (`config.yml` by default, or the file indicated by the `-c,
--config <FILE>` command line option or the `$PROBE_CONFIG` environment
variable). The property is an object in which keys are command names and values
are the definitions of the commands to run:

```yml
commands:
  lsRoot:
    type: system
    command: ls
    args: [ -la, / ]
  unameAll
    type: system
    command: uname
    args: [ -a ]
```

The following command types are supported:

* Arbitrary [JavaScript functions](#function-commands) to be executed by Probe It.
* [System commands](#system-commands) to spawn in a new process.



### Function commands

If your configuration file is a JavaScript file instead of a JSON or YAML file,
you can also define a command to probe as an arbitrary JavaScript function:

```js
exports.commands = {
  doStuff: {
    type: 'function',
    command: async function() {

      try {
        // Read metrics from a file
        const metrics = await fs.Promises.readFile('/metrics.json', 'utf8');
        return {
          metrics,
          failures: [],
          success: true
        };
      } catch (err) {
        // Describe possible failure
        return {
          failures: [
            cause: "invalidMetricsFile",
            description: "Could not read metrics file"
          ],
          metrics: [],
          success: false
        };
      }
    }
  }
};
```

The function may be synchronous or asynchronous, and must return an object with
the following properties:

* **`metrics`** - An array of objects describin the metrics produced by running
  the command. Each metrics object must be in the [correct format](#metrics).
* **`failures`** - An array of objects describing reasons why the probe failed
  (it may be empty). Each failure object must have:

  * A `cause` property which is a string code identifying the failure.
  * A human-readable `description` property.
  * An optional `expected` property indicating the expected value.
  * An optional `actual` property indicating the actual value which differs from
    the expected one.
  * Optional extra properties describing the failure.
* **`success`** - `true` or `false` to indicate whether the probe succeeded.



### System commands

System commands are commands that will be spawned in a new process on the
machine on which Probe It is running. They can be defined with all configuration
file formats (JavaScript, JSON or YAML), for example in JSON:

```json
{
  "commands": {
    "lsRoot": {
      "type": "system",
      "command": "ls",
      "args": [ "-la", "/" ],
      "cwd": "/"
    }
  }
}
```

The following options describe a system command:

* **`command`** - The executable to run.
* **`args`** - An optional array of arguments to pass to the executable.
* **`cwd`** - An optional working directory to run the executable in.



#### System command metrics

The following sub-headings document the metrics provided by a system command probe.

#### `commandExitCode`

**Type:** number

The exit code of the executed command. `0` indicates successful execution, while
and non-zero code indicates some kind of failure.

```json
{
  "description": "...",
  "name": "commandExitCode",
  "tags": {},
  "type": "number",
  "value": 0
}
```



## HTTP probe

The HTTP probe is used when the target is an URL that starts with `http://` or
`https://`. By default, it will make a `GET` request to that URL, following any
redirects, and provide various metrics about the HTTP response.



### HTTP probe metrics

The following sub-headings document the metrics provided by the HTTP probe.

#### `httpCertificateExpiry`

**Type:** datetime

Expiration date of the SSL certificate (when the target starts with `https://`).

```json
{
  "description": "...",
  "name": "httpCertificateExpiry",
  "tags": {},
  "type": "datetime",
  "value": "2018-05-01T00:00:00Z"
}
```

#### `httpContentLength`

**Type:** bytes

Length of the HTTP response in bytes.

```json
{
  "description": "...",
  "name": "httpContentLength",
  "tags": {},
  "type": "bytes",
  "value": 2801239
}
```

#### `httpDuration`

**Type:** seconds, **Repeated**

Duration of the HTTP request(s) by phase, summed over all redirects, in seconds.
Several instances of this metric will be provided, one for each request phase:

* `dnsLookup` - How long it took to perform the DNS lookup.
* `tcpConnection` - How long it took to open the TCP connection after the DNS lookup.
* `tlsHandshake` - How long it took to perform the TLS handshake for an HTTPS probe,
                   after the TCP connection was established. (This metric will be
                   absent for URLs starting with `http://`.)
* `firstByte` - How long it took to receive the first byte of the response after the
                TLS handshake (or TCP connection).
* `contentTransfer` - How long it took to transfer the entire response entity once the
                      first byte was received.

```json
{
  "description": "...",
  "name": "httpDuration",
  "tags": {
    "phase": "tlsHandshake"
  },
  "type": "seconds",
  "value": 0.02
}
```

#### `httpRedirects`

**Type:** quantity

Number of times HTTP 301 or 302 redirects were followed.

```json
{
  "description": "...",
  "name": "httpRedirects",
  "tags": {},
  "type": "quantity",
  "value": 2
}
```

#### `httpSecure`

**Type:** boolean

Indicates whether SSL/TLS was used for the final redirect.

```json
{
  "description": "...",
  "name": "httpSecure",
  "tags": {},
  "type": "boolean",
  "value": true
}
```

#### `httpStatusCode`

**Type:** number

HTTP status code of the final response.

```json
{
  "description": "...",
  "name": "httpStatusCode",
  "tags": {},
  "type": "number",
  "value": 404
}
```

#### `httpVersion`

**Type:** number

HTTP version of the final response.

```json
{
  "description": "...",
  "name": "httpVersion",
  "tags": {},
  "type": "number",
  "value": 1.1
}
```



### HTTP probe parameters

The following sub-headings document URL query parameters that can be provided to
customize the behavior of the HTTP probe.

#### `allowUnauthorized`

**Type:** boolean, **Default:** `false`

Whether to consider an HTTP response with an invalid SSL certificate as a
success.

```
?allowUnauthorized=true
```

#### `followRedirects`

**Type:** boolean, **Default:** `true`

Whether the probe will follow redirects (e.g. HTTP 301 Moved Permanently or HTTP
302 Found) to provide metrics about the final response, or whether it will
simply provide metrics about the first response sent by the server.

```
?followRedirects=false
```

#### `header`

**Type:** `key=value` pair, **Repeatable**

HTTP header to add to the probe's request(s). This parameter can be repeated to
set multiple headers.

```
// The value is "Authorization=Basic YWRtaW46Y2hhbmdlbWUh", URL-encoded
?header=Authorization%3DBasic%20YWRtaW46Y2hhbmdlbWUh
```

#### `method`

**Type:** string (`GET`, `POST`, `PUT`, etc.), **Default:** `GET`

The HTTP method to use for the request on the target URL. `GET` by default.

```
?method=POST
```



### HTTP probe expectations

The following sub-headings document URL query parameters that can be
provided to customize how the HTTP probe will determine if it was successful.

By default, it only expects that the final HTTP response will have a code in the
2xx or 3xx range.

#### `expectHttpRedirects`

**Type:** boolean or integer

For the probe to be considered successful with this parameter:

* If `true`, at least 1 redirect must have been followed.
* If `false`, no redirect must have been followed.
* If an integer, exactly that number of redirects must have been followed.

```
?expectHttpRedirects=true
?expectHttpRedirects=2
```

**Possible failures:**

* [`invalidHttpRedirectCount`](#invalidhttpredirectcount)
* [`missingHttpRedirect`](#missinghttpredirect)
* [`unexpectedHttpRedirect`](#unexpectedhttpredirect)

#### `expectHttpRedirectTo`

**Type:** URL

For the probe to be considered successful with this parameter:

* At least 1 redirect must have been followed.
* The protocol, host, port and path of the final HTTP request's URL must correspond
  to the specified URL. (Other parts of the URL, such as authentication, query
  string or hash, are ignored for the comparison.)

```
// The value is "http://example.com/path", URL-encoded
?expectHttpRedirectTo=http%3A%2F%2Fexample.com%2Fpath
```

**Possible failures:**

* [`invalidHttpRedirectLocation`](#invalidhttpredirectlocation)

#### `expectHttpResponseBodyMatch`

**Type:** regular expression, **Repeatable**

For the probe to be considered successful with this parameter, the HTTP response
body must match the regular expression.

This parameter can be repeated to check the presence of multiple patterns.

```
// The value is "Catch \d{2}", URL-encoded
?expectHttpResponseBodyMatch=Catch%20%5Cd%7B2%7D
```

**Possible failures:**

* [`httpResponseBodyMismatch`](#httpresponsebodymismatch)

#### `expectHttpResponseBodyMismatch`

**Type:** regular expression, **Repeatable**

For the probe to be considered successful with this parameter, the HTTP response
body must **not** match the regular expression.

This parameter can be repeated to check the absence of multiple patterns.

```
// The value is "connection lost", URL-encoded
?expectHttpResponseBodyMismatch=connection+lost
```

**Possible failures:**

* [`unexpectedHttpResponseBodyMatch`](#unexpectedhttpresponsebodymatch)

#### `expectHttpSecure`

**Type:** boolean

For the probe to be considered successful with this parameter:

* If `true`, the final HTTP response must have been over TLS (e.g. `https://`).
* If `false`, the final HTTP response must **not** have been over TLS (e.g.
  `http://`).

By default, either is considered successful.

Note that this does not affect the probe's behavior of failing if an SSL
certificate is invalid. Use the [`allowUnauthorized`
parameter](#allowunauthorized) for that.

```
?expectHttpSecure=true
```

**Possible failures:**

* [`insecureHttp`](#insecurehttp)
* [`unexpectedlySecureHttp`](#unexpectedlysecurehttp)

#### `expectHttpStatusCode`

**Type:** number or HTTP status code class (e.g. `2xx`), **Repeatable**, **Default:** `[ "2xx", "3xx" ]`

For the probe to be considered successful with this parameter, the final HTTP
response's status code must be one of the expected codes, or fall within one of
the expected classes (e.g. `204` falls within the `2xx` class). Both individual
codes and code classes may be provided.

```
?expectHttpStatusCode=204
?expectHttpStatusCode=200&expectHttpStatusCode=3xx
```

**Possible failures:**

* [`invalidHttpStatusCode`](#invalidhttpstatuscode)

#### `expectHttpVersion`

**Type:** number

For the probe to be considered successful with this parameter, the HTTP version
of the final response must match the expected version.

```
?expectHttpVersion=1.1
```

**Possible failures:**

* [`invalidHttpVersion`](#invalidhttpversion)



### HTTP probe failures

The following sub-headings document the possible causes of failure that may be
included in the HTTP probe's result.

#### `httpResponseBodyMismatch`

The body of the final HTTP response did not match some of the regular
expressions provided with the [`expectHttpResponseBodyMatch`
parameter](#expecthttpresponsebodymatch).

This failure will be repeated for each regular expression that did not match.

```json
{
  "cause": "httpResponseBodyMismatch",
  "description": "...",
  "expected": "[a-z0-9]+"
}
```

#### `insecureHttp`

The final HTTP request was expected to be over TLS due to the [`expectHttpSecure`
parameter](#expecthttpsecure) being set to `true`, but it was not.

```json
{
  "cause": "insecureHttp",
  "description": "..."
}
```

#### `invalidHttpRedirectCount`

An integer was provided as the expected number of redirects with the
[`expectHttpRedirects` parameter](#expecthttpredirects), and the actual number
of followed redirects until the final HTTP response did not match that
expectation.

```json
{
  "actual": 2,
  "cause": "invalidHttpRedirectCount",
  "description": "...",
  "expected": 1
}
```

#### `invalidHttpRedirectLocation`

The final redirection was expected to be made to the URL specified with the
[`expectHttpRedirectTo` parameter](#expecthttpredirectto), but a different URL
was provided by the server.

```json
{
  "actual": "http://example.com/foo",
  "cause": "invalidHttpRedirectLocation",
  "description": "...",
  "expected": "http://example.com/bar"
}
```

#### `invalidHttpStatusCode`

The HTTP status code of the final response did not match any of the expected
codes or code classes provided with the [`expectHttpStatusCode`
parameter](#expecthttpstatuscode) (or set by default).

```json
{
  "actual": 404,
  "cause": "invalidHttpStatusCode",
  "description": "...",
  "expected": [ "200", "3xx" ]
}
```

#### `invalidHttpVersion`

The HTTP version of the final response was not the expected version provided
with the [`expectHttpVersion` parameter](#expecthttpversion).

```json
{
  "actual": 2.0,
  "cause": "invalidHttpStatusCode",
  "description": "...",
  "expected": 1.1
}
```

#### `missingHttpRedirect`

The [`expectHttpRedirects` parameter](#expecthttpredirects) was set to `true`,
but no redirect was issued by the server.

```json
{
  "cause": "missingHttpRedirect",
  "description": "..."
}
```

#### `unexpectedHttpRedirect`

The [`expectHttpRedirects` parameter](#expecthttpredirects) was set to `false`,
but the server issued one or more redirects.

```json
{
  "actual": 3,
  "cause": "missingHttpRedirect",
  "description": "...",
  "expected": 0
}
```

#### `unexpectedHttpResponseBodyMatch`

The body of the final HTTP response matched some of the regular expressions
provided with the [`expectHttpResponseBodyMismatch`
parameter](#expecthttpresponsebodymismatch).

This failure will be repeated for each regular expression that matched.

The failure object's `actual` property will contain the full regular expression
match.

```json
{
  "actual": "error: connection lost",
  "cause": "unexpectedHttpResponseBodyMatch",
  "description": "...",
  "expected": "error: .+"
}
```

#### `unexpectedlySecureHttp`

The final HTTP request was expected **not** to be over TLS due to the
[`expectHttpSecure` parameter](#expecthttpsecure) being set to `false`, but it
was.

```json
{
  "cause": "unexpectedlySecureHttp",
  "description": "..."
}
```



## S3 probe

The S3 probe is used when the target is an URL that starts with `s3://`.  The
format is as follows:

    s3://[access_key_id:secret_access_key@]bucket_name[/prefix]

For example:

* `s3://my_bucket`
* `s3://A28sdf8A:oa83ufozsr8b@secure_backups/daily`

By default, the probe will list all the objects in the bucket and provide
various metrics about these objects' sizes and last modification dates. It can
also be configured to list object versions with the [`s3Versions`
parameter](#s3versions).



### S3 probe metrics

The following sub-headings document the metrics provided by the S3 probe.

#### `s3FirstObjectModificationDate`

**Type:** datetime

The modification date of the earliest modified object.

```json
{
  "description": "...",
  "name": "s3FirstObjectModificationDate",
  "tags": {},
  "type": "datetime",
  "value": "2018-05-01T00:00:00Z"
}
```

#### `s3FirstObjectVersionModificationDate`

**Type:** datetime

The modification date of the earliest modified object version.

**Note:** this metric will only be provided if the [`s3Versions` parameter] is
set to `true`.

```json
{
  "description": "...",
  "name": "s3FirstObjectVersionModificationDate",
  "tags": {},
  "type": "datetime",
  "value": "2018-05-01T00:00:00Z"
}
```

#### `s3LargestObjectSize`

**Type:** bytes

The size of the largest object in bytes.

```json
{
  "description": "...",
  "name": "s3LargestObjectSize",
  "tags": {},
  "type": "bytes",
  "value": 18392047
}
```

#### `s3LastObjectModificationDate`

**Type:** datetime

The modification date of the most recently modified object.

```json
{
  "description": "...",
  "name": "s3LastObjectModificationDate",
  "tags": {},
  "type": "datetime",
  "value": "2018-05-01T00:00:00Z"
}
```

#### `s3LastObjectVersionModificationDate`

**Type:** datetime

The modification date of the most recently modified object version.

**Note:** this metric will only be provided if the [`s3Versions` parameter] is
set to `true`.

```json
{
  "description": "...",
  "name": "s3LastObjectVersionModificationDate",
  "tags": {},
  "type": "datetime",
  "value": "2018-05-01T00:00:00Z"
}
```

#### `s3ObjectsCount`

**Type:** quantity

Number of objects.

```json
{
  "description": "...",
  "name": "s3ObjectsCount",
  "tags": {},
  "type": "quantity",
  "value": 23
}
```

#### `s3ObjectsTotalSize`

**Type:** bytes

Total size of objects.

```json
{
  "description": "...",
  "name": "s3ObjectsTotalSize",
  "tags": {},
  "type": "bytes",
  "value": 4027329041
}
```

#### `s3ObjectVersionsCount`

**Type:** quantity

Number of object versions.

**Note:** this metric will only be provided if the [`s3Versions` parameter] is
set to `true`.

```json
{
  "description": "...",
  "name": "s3ObjectVersionsCount",
  "tags": {},
  "type": "quantity",
  "value": 32
}
```

#### `s3SmallestObjectSize`

**Type:** bytes

The size of the smallest object in bytes.

```json
{
  "description": "...",
  "name": "s3SmallestObjectSize",
  "tags": {},
  "type": "bytes",
  "value": 351
}
```



### S3 probe parameters

The following sub-headings document URL query parameters that can be provided to
customize the behavior of the S3 probe.

#### `s3ByPrefix`

**Type:** string, **Repeatable**

When provided `N` times, this parameter will cause each metric to be provided `N +
1` times in the response:

* Once for each prefix (`N`)
* Once for no prefix (`+ 1`)

```
?s3ByPrefix=daily&s3ByPrefix=monthly
```

For example, if the parameter is provided twice with the values `daily` and
`monthly` like in the example above, the `s3ObjectsTotalSize` metric will be
present twice (as will all other metrics of the S3 probe). Those separate metric
objects can be differentiated by their `tags` property:

```json
{
  "description": "...",
  "name": "s3ObjectsTotalSize",
  "tags": {
    "prefix": ""
  },
  "type": "bytes",
  "value": 4027329041
},
{
  "description": "...",
  "name": "s3ObjectsTotalSize",
  "tags": {
    "prefix": "daily"
  },
  "type": "bytes",
  "value": 230918
},
{
  "description": "...",
  "name": "s3ObjectsTotalSize",
  "tags": {
    "prefix": "monthly"
  },
  "type": "bytes",
  "value": 2507812
}
```

#### `s3Versions`

**Type:** boolean, **Default:** `false`

Whether to list objects versions in the bucket and generate metrics for them.

```
?s3Versions=true
```



## Versioning policy

This project follows the rules of [semantic versioning
v2.0.0](https://semver.org/spec/v2.0.0.html). Check the
[CHANGELOG](CHANGELOG.md) for breaking changes between major versions.

**Beware:** changes to the `description` property of metrics or failures will
**not** be considered breaking.

Please file a bug If you notice an actual breaking change without a
corresponding major version number change.
