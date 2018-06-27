# Probe Server

Server that probes endpoints over HTTP & HTTPS and
[AWS](https://aws.amazon.com) [S3](https://aws.amazon.com/s3/) buckets,
producing metrics in JSON or for [Prometheus](https://prometheus.io).

Inspired by [Prometheus Blackbox
Exporter](https://github.com/prometheus/blackbox_exporter).

[![npm version](https://badge.fury.io/js/probe-srv.svg)](https://badge.fury.io/js/probe-srv)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Usage](#usage)
  - [Installation](#installation)
  - [Prometheus format](#prometheus-format)
- [Metrics](#metrics)
  - [Generic metrics](#generic-metrics)
    - [`duration`](#duration)
- [HTTP probe](#http-probe)
  - [Metrics](#metrics-1)
    - [`httpCertificateExpiry`](#httpcertificateexpiry)
    - [`httpContentLength`](#httpcontentlength)
    - [`httpDuration`](#httpduration)
    - [`httpRedirects`](#httpredirects)
    - [`httpSecure`](#httpsecure)
    - [`httpStatusCode`](#httpstatuscode)
    - [`httpVersion`](#httpversion)
  - [Parameters](#parameters)
    - [`allowUnauthorized`](#allowunauthorized)
    - [`followRedirects`](#followredirects)
    - [`method`](#method)
    - [`header`](#header)
  - [Expectations](#expectations)
    - [`expectHttpRedirects`](#expecthttpredirects)
    - [`expectHttpRedirectTo`](#expecthttpredirectto)
    - [`expectHttpResponseBodyMatch`](#expecthttpresponsebodymatch)
    - [`expectHttpResponseBodyMismatch`](#expecthttpresponsebodymismatch)
    - [`expectHttpSecure`](#expecthttpsecure)
    - [`expectHttpStatusCode`](#expecthttpstatuscode)
    - [`expectHttpVersion`](#expecthttpversion)
  - [Failures](#failures)
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
- [Versioning policy](#versioning-policy)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



## Usage

Visit
[http://probe-srv.herokuapp.com/?target=https://google.com&pretty=true](http://probe-srv.herokuapp.com/?target=https://google.com&pretty=true)
for a sample probe of an HTTPS endpoint.

The `target` query parameter indicates what to probe:

* An HTTP(S) endpoint, e.g. `https://google.com`
* An S3 bucket, e.g. `s3://aws_access_key_id:aws_secret_access_key@bucket_name`

The response will be a JSON object with:

* A `success` boolean property indicating whether the probe was successful.
* A `metrics` array of objects, describing various metrics collected from the
  probed endpoint, such as duration, HTTP status code, number of S3 objects, etc.
* A `failures` array which may indicate possible causes of the probe's failure.



### Installation

**Run it with [Docker](https://www.docker.com)**

```bash
docker run -p 3000:3000 alphahydrae/probe-srv
```

**Or, run it with [npx](https://github.com/zkat/npx)**

```bash
npx probe-srv
```

**Or, install and run it manually**

```bash
npm install -g probe-srv
probe-srv
```

**Then, try it**

Visit [http://localhost:3000?target=https://google.com&pretty=true](http://localhost:3000?target=https://google.com&pretty=true)



### Prometheus format

To get the metrics in [Prometheus](https://prometheus.io)'s text format, use the `/metrics` path:

[http://probe-srv.herokuapp.com/metrics?target=https://google.com](http://probe-srv.herokuapp.com/metrics?target=https://google.com)



## Metrics

This section lists all metrics produced by the various probes.



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



## HTTP probe

The HTTP probe is used when the target is an URL that starts with `http://` or
`https://`. By default, it will make a `GET` request to that URL, following any
redirects, and provide various metrics about the HTTP response.



### Metrics

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



### Parameters

The following sub-headings document URL query parameters that can be provided to
customize the behavior of the HTTP probe.

#### `allowUnauthorized`

**Type:** boolean, **Default:** `false`

Whether to consider an HTTP response with an invalid SSL certificate as a
success.

    ?allowUnauthorized=true

#### `followRedirects`

**Type:** boolean, **Default:** `true`

Whether the probe will follow redirects (e.g. HTTP 301 Moved Permanently or HTTP
302 Found) to provide metrics about the final response, or whether it will
simply provide metrics about the first response sent by the server.

    ?followRedirects=false

#### `method`

**Type:** string (`GET`, `POST`, `PUT`, etc.), **Default:** `GET`

The HTTP method to use for the request on the target URL. `GET` by default.

    ?method=POST

#### `header`

**Type:** `key=value` pair, **Repeatable**

HTTP header to add to the probe's request(s). This parameter can be repeated to
set multiple headers.

    // The value is "Authorization=Basic YWRtaW46Y2hhbmdlbWUh", URL-encoded
    ?header=Authorization%3DBasic%20YWRtaW46Y2hhbmdlbWUh



### Expectations

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

    ?expectHttpRedirects=true
    ?expectHttpRedirects=2

#### `expectHttpRedirectTo`

**Type:** URL

For the probe to be considered successful with this parameter:

* At least 1 redirect must have been followed.
* The protocol, host, port and path of the final HTTP request's URL must correspond
  to the specified URL. (Other parts of the URL, such as authentication, query
  string or hash, are ignored for the comparison.)

    // The value is "http://example.com/path", URL-encoded
    ?expectHttpRedirectTo=http%3A%2F%2Fexample.com%2Fpath

#### `expectHttpResponseBodyMatch`

**Type:** regular expression, **Repeatable**

For the probe to be considered successful with this parameter, the HTTP response
body must match the regular expression.

This parameter can be repeated to check the presence of multiple patterns.

    // The value is "Catch \d{2}", URL-encoded
    ?expectHttpResponseBodyMatch=Catch%20%5Cd%7B2%7D

#### `expectHttpResponseBodyMismatch`

**Type:** regular expression, **Repeatable**

For the probe to be considered successful with this parameter, the HTTP response
body must **not** match the regular expression.

This parameter can be repeated to check the absence of multiple patterns.

    // The value is "connection lost", URL-encoded
    ?expectHttpResponseBodyMismatch=connection+lost

#### `expectHttpSecure`

**Type:** boolean

For the probe to be considered successful with this parameter:

* If `true`, the final HTTP response must have been over TLS (e.g. `https://`).
* If `false`, the final HTTP response must **not** have been over TLS (e.g.
  `http://`).

By default, either is considered successful.

Note that this does not affect the probe's behavior of failing if an SSL
certificate is invalid. Use the [`allowUnauthorized`
parameter](#allowUnauthorized) for that.

    ?expectHttpSecure=true

#### `expectHttpStatusCode`

**Type:** number or HTTP status code class (e.g. `2xx`), **Repeatable**, **Default:** `[ "2xx", "3xx" ]`

For the probe to be considered successful with this parameter, the final HTTP
response's status code must be one of the expected codes, or fall within one of
the expected classes (e.g. `204` falls within the `2xx` class). Both individual
codes and code classes may be provided.

    ?expectHttpStatusCode=204
    ?expectHttpStatusCode=200&expectHttpStatusCode=3xx

#### `expectHttpVersion`

**Type:** number

For the probe to be considered successful with this parameter, the HTTP version
of the final response must match the expected version.

    ?expectHttpVersion=1.1



### Failures

The following sub-headings document the possible causes of failure that may be
included in the HTTP probe's result.

#### `httpResponseBodyMismatch`

The body of the final HTTP response did not match some of the regular
expressions provided with the `expectHttpResponseBodyMatch` parameter.

This failure will be repeated for each regular expression that did not match.

```json
{
  "cause": "httpResponseBodyMismatch",
  "description": "...",
  "expected": "[a-z0-9]+"
}
```

#### `insecureHttp`

The final HTTP request was expected to be over TLS due to the `expectHttpSecure`
parameter being set to `true`, but it was not.

```json
{
  "cause": "insecureHttp",
  "description": "..."
}
```

#### `invalidHttpRedirectCount`

An integer was provided as the expected number of redirects with the
`expectHttpRedirects` parameter, and the actual number of followed redirects
until the final HTTP response did not match that expectation.

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
`expectHttpRedirectTo` parameter, but a different URL was provided by the
server.

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
codes or code classes provided with the `expectHttpStatusCode` parameter (or set
by default).

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
with the `expectHttpVersion` parameter.

```json
{
  "actual": 2.0,
  "cause": "invalidHttpStatusCode",
  "description": "...",
  "expected": 1.1
}
```

#### `missingHttpRedirect`

The `expectHttpRedirects` parameter was set to `true`, but no redirect was
issued by the server.

```json
{
  "cause": "missingHttpRedirect",
  "description": "..."
}
```

#### `unexpectedHttpRedirect`

The `expectHttpRedirects` parameter was set to `false`, but the server issued
one or more redirects.

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
provided with the `expectHttpResponseBodyMismatch` parameter.

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
`expectHttpSecure` parameter being set to `false`, but it was.

```json
{
  "cause": "unexpectedlySecureHttp",
  "description": "..."
}
```



## Versioning policy

This project follows the rules of [semantic versioning
v2.0.0](https://semver.org/spec/v2.0.0.html). Check the
[CHANGELOG](CHANGELOG.md) for breaking changes between major versions.

**Beware:** changes to the `description` property of metrics or failures will
**not** be considered breaking.

Please file a bug If you notice an actual breaking change without a
corresponding major version number change.
