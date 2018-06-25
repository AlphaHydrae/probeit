# Probe Server

Server to easily probe endpoints over HTTP & HTTPS.

[![npm version](https://badge.fury.io/js/probe-srv.svg)](https://badge.fury.io/js/probe-srv)
[![Build Status](https://travis-ci.org/AlphaHydrae/probe-srv.svg?branch=master)](https://travis-ci.org/AlphaHydrae/probe-srv)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)



## Usage

**Try it on [Heroku](https://www.heroku.com/)**

Visit [http://probe-srv.herokuapp.com/?target=https://google.com&pretty=true](http://probe-srv.herokuapp.com/?target=https://google.com&pretty=true)

**Or, run it with [Docker](https://www.docker.com)**

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

**Then, try it locally**

Visit [http://localhost:3000?target=https://google.com&pretty=true](http://localhost:3000?target=https://google.com&pretty=true)
