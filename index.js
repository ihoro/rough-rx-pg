'use strict';

const { Observable } = require('rxjs');
const { map, flatMap, tap, count, catchError } = require('rxjs/operators');

module.exports = class RxSql {
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
    let rxsql = null;
    return this.getConnection().pipe(
      tap(c => connection = c),
      map(connection => new RxSql(connection)),
      tap(r => rxsql = r),
      flatMap(_ => rxsql.query('BEGIN')),
      ...queryFunctions.map(query => flatMap(prevResult => query(rxsql, prevResult))),
      count(),
      flatMap(_ => rxsql.query('COMMIT')),
      catchError(err => {
        return rxsql.query('ROLLBACK').pipe(
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
