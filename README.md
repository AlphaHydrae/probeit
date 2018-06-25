# Probe Server

Server to easily probe endpoints over HTTP & HTTPS.

[![npm version](https://badge.fury.io/js/probe-srv.svg)](https://badge.fury.io/js/probe-srv)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)



## Usage

Visit [http://probe-srv.herokuapp.com/?target=https://google.com&pretty=true](http://probe-srv.herokuapp.com/?target=https://google.com&pretty=true)

The `target` query parameter indicates the HTTP(S) URL to probe.

The response will be a JSON object with a `success` boolean property indicating whether the probe was successful.
Other properties of the object will provide various metrics about the probed endpoint,
such as durations, HTTP status code, etc.



## Installation

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
