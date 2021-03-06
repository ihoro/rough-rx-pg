# Rx'ified node-postgres (pg)

[![Build Status](https://travis-ci.com/ihoro/rough-rx-pg.svg?branch=master)](https://travis-ci.com/ihoro/rough-rx-pg)
[![npm version](https://badge.fury.io/js/%40rough%2Frx-pg.svg)](https://badge.fury.io/js/%40rough%2Frx-pg)

Rough implementation of [rxified](https://npmjs.com/rxjs) wrapper of [node-postgres](https://npmjs.com/pg) lib.

## Getting started

Installation
```
$ npm i pg @rough/rx-pg
```

A simple query
```js
const { finalize } = require('rxjs/operators');
const { Pool } = require('pg');
const RxPg = require('@rough/rx-pg');

const pool = new Pool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'myproject',
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

const rxpg = new RxPg(pool);

rxpg
  .query('select * from users')
  .pipe(finalize(_ => pool.end()))
  .subscribe(result => console.log(result));
```

A simple transaction
```js
rxpg
  .transaction(
    (rxpg, prevResult) => rxpg.query('select * from users where id = ? for update', 42),
    (rxpg, prevResult) => rxpg.query('delete from deals where user_scope_id = ?', prevResult[0].user_scope_id),
    (rxpg, prevResult) => rxpg.query('delete from inventory where user_id = ?', 42),
  )
  .pipe(finalize(_ => pool.end()))
  .subscribe(result => console.log(result));
```
