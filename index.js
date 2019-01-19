'use strict';

const { Observable } = require('rxjs');
const { map, flatMap, tap, count, catchError } = require('rxjs/operators');

module.exports = class RxPg {
  constructor(pool) {
    this.pool = pool;
  }

  query(sql, params) {
    return Observable.create(observer => {
      function dbCallback(err, result) {
        if (err)
          observer.error(err);
        else
          observer.next(result);
        observer.complete();
      }
      if (params)
        this.pool.query(sql, params, dbCallback);
      else
        this.pool.query(sql, dbCallback);
    });
  }

  transaction(...queryFunctions) {
    let connection = null;
    let rxpg = null;
    return this.getConnection().pipe(
      tap(c => connection = c),
      map(connection => new RxPg(connection)),
      tap(r => rxpg = r),
      flatMap(_ => rxpg.query('BEGIN')),
      ...queryFunctions.map(query => flatMap(prevResult => query(rxpg, prevResult))),
      count(),
      flatMap(_ => rxpg.query('COMMIT')),
      catchError(err => {
        return rxpg.query('ROLLBACK').pipe(
          tap(_ => connection.release()),
          tap(_ => { throw err; })
        );
      }),
      tap(_ => connection.release())
    );
  }

  getConnection() {
    return Observable.create(observer => {
      this.pool.connect((err, connection) => {
        if (err)
          observer.error(err);
        else
          observer.next(connection);
        observer.complete();
      });
    });
  }
};
