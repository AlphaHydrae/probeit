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
  - [HTTP probe metrics](#http-probe-metrics)

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

These metrics are always present regardless of the selected probe:

* `duration` - *seconds*

  How long the probe took to complete in seconds.

### HTTP probe metrics

These metrics are provided by the HTTP probe, which is used when the target starts with `http://` or `https://`:

* `httpCertificateExpiry` - *datetime*

  Expiration date of the SSL certificate (when the target starts with `https://`).

  ```json
  {
    "description": "Expiration date of the SSL certificate",
    "name": "httpCertificateExpiry",
    "tags": {},
    "type": "datetime",
    "value": "2018-05-01T00:00:00Z"
  }
  ```

* `httpContentLength` - *bytes*

  Length of the HTTP response in bytes.

  ```json
  {
    "description": "Length of the HTTP response entity in bytes",
    "name": "httpContentLength",
    "tags": {},
    "type": "bytes",
    "value": 2801239
  }
  ```

* `httpDuration` - *seconds*, *multiple*

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
    "description": "Duration of the HTTP request(s) by phase, summed over all redirects, in seconds",
    "name": "httpDuration",
    "tags": {
      "phase": "tlsHandshake"
    },
    "type": "seconds",
    "value": 0.02
  }
  ```

* `httpRedirects` - *quantity*

  Number of times HTTP 301 or 302 redirects were followed.

  ```json
  {
    "description": "Length of the HTTP response in bytes",
    "name": "httpRedirects",
    "tags": {},
    "type": "quantity",
    "value": 2
  }
  ```

* `httpSecure` - *boolean*

  Indicates whether SSL/TLS was used for the final redirect.

  ```json
  {
    "description": "Indicates whether SSL/TLS was used for the final request",
    "name": "httpSecure",
    "tags": {},
    "type": "boolean",
    "value": true
  }
  ```

* `httpStatusCode` - *number*

  HTTP status code of the final response.

  ```json
  {
    "description": "HTTP status code of the final response",
    "name": "httpStatusCode",
    "tags": {},
    "type": "number",
    "value": 404
  }
  ```

* `httpVersion` - *number*

  HTTP version of the final response.

  ```json
  {
    "description": "HTTP version of the final response",
    "name": "httpVersion",
    "tags": {},
    "type": "number",
    "value": 1.1
  }
  ```
