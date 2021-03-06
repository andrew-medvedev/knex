'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _toArray2 = require('lodash/toArray');

var _toArray3 = _interopRequireDefault(_toArray2);

var _tail2 = require('lodash/tail');

var _tail3 = _interopRequireDefault(_tail2);

var _isUndefined2 = require('lodash/isUndefined');

var _isUndefined3 = _interopRequireDefault(_isUndefined2);

var _isString2 = require('lodash/isString');

var _isString3 = _interopRequireDefault(_isString2);

var _isObject2 = require('lodash/isObject');

var _isObject3 = _interopRequireDefault(_isObject2);

var _isNumber2 = require('lodash/isNumber');

var _isNumber3 = _interopRequireDefault(_isNumber2);

var _isFunction2 = require('lodash/isFunction');

var _isFunction3 = _interopRequireDefault(_isFunction2);

var _isEmpty2 = require('lodash/isEmpty');

var _isEmpty3 = _interopRequireDefault(_isEmpty2);

var _isBoolean2 = require('lodash/isBoolean');

var _isBoolean3 = _interopRequireDefault(_isBoolean2);

var _each2 = require('lodash/each');

var _each3 = _interopRequireDefault(_each2);

var _clone2 = require('lodash/clone');

var _clone3 = _interopRequireDefault(_clone2);

var _assign2 = require('lodash/assign');

var _assign3 = _interopRequireDefault(_assign2);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _inherits = require('inherits');

var _inherits2 = _interopRequireDefault(_inherits);

var _events = require('events');

var _raw = require('../raw');

var _raw2 = _interopRequireDefault(_raw);

var _helpers = require('../helpers');

var helpers = _interopRequireWildcard(_helpers);

var _joinclause = require('./joinclause');

var _joinclause2 = _interopRequireDefault(_joinclause);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Typically called from `knex.builder`,
// start a new query building chain.

// Builder
// -------
function Builder(client) {
  this.client = client;
  this.and = this;
  this._single = {};
  this._statements = [];
  this._method = 'select';
  this._debug = client.config && client.config.debug;

  // Internal flags used in the builder.
  this._joinFlag = 'inner';
  this._boolFlag = 'and';
  this._notFlag = false;
}
(0, _inherits2.default)(Builder, _events.EventEmitter);

(0, _assign3.default)(Builder.prototype, {
  toString: function toString() {
    return this.toQuery();
  },


  // Convert the current query "toSQL"
  toSQL: function toSQL(method, tz) {
    return this.client.queryCompiler(this).toSQL(method || this._method, tz);
  },


  // Create a shallow clone of the current query builder.
  clone: function clone() {
    var cloned = new this.constructor(this.client);
    cloned._method = this._method;
    cloned._single = (0, _clone3.default)(this._single);
    cloned._statements = (0, _clone3.default)(this._statements);
    cloned._debug = this._debug;

    // `_option` is assigned by the `Interface` mixin.
    if (!(0, _isUndefined3.default)(this._options)) {
      cloned._options = (0, _clone3.default)(this._options);
    }

    return cloned;
  },
  timeout: function timeout(ms) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        cancel = _ref.cancel;

    if ((0, _isNumber3.default)(ms) && ms > 0) {
      this._timeout = ms;
      if (cancel) {
        this.client.assertCanCancelQuery();
        this._cancelOnTimeout = true;
      }
    }
    return this;
  },


  // With
  // ------

  with: function _with(alias, statement, bindings) {
    if (typeof alias !== 'string') {
      throw new Error('with() first argument must be a string');
    }
    if (typeof statement === 'function') {
      return this.withWrapped(alias, statement);
    }
    // Allow a raw statement to be passed along to the query.
    if (statement instanceof _raw2.default && arguments.length >= 2) {
      return this.withRaw(alias, statement, bindings);
    }
    throw new Error('with() second argument must be a function or a raw');
  },


  // Adds a raw `with` clause to the query.
  withRaw: function withRaw(alias, sql, bindings) {
    var raw = sql instanceof _raw2.default ? sql : this.client.raw(sql, bindings);
    this._statements.push({
      grouping: 'with',
      type: 'withRaw',
      alias: alias,
      value: raw
    });
    return this;
  },


  // Helper for compiling any advanced `with` queries.
  withWrapped: function withWrapped(alias, callback) {
    this._statements.push({
      grouping: 'with',
      type: 'withWrapped',
      alias: alias,
      value: callback
    });
    return this;
  },


  // Select
  // ------

  // Adds a column or columns to the list of "columns"
  // being selected on the query.
  columns: function columns(column) {
    if (!column) return this;
    this._statements.push({
      grouping: 'columns',
      value: helpers.normalizeArr.apply(null, arguments)
    });
    return this;
  },


  // Allow for a sub-select to be explicitly aliased as a column,
  // without needing to compile the query in a where.
  as: function as(column) {
    this._single.as = column;
    return this;
  },


  // Prepends the `schemaName` on `tableName` defined by `.table` and `.join`.
  withSchema: function withSchema(schemaName) {
    this._single.schema = schemaName;
    return this;
  },


  // Sets the `tableName` on the query.
  // Alias to "from" for select and "into" for insert statements
  // e.g. builder.insert({a: value}).into('tableName')
  // `options`: options object containing keys:
  //   - `only`: whether the query should use SQL's ONLY to not return
  //           inheriting table data. Defaults to false.
  table: function table(tableName) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    this._single.table = tableName;
    this._single.only = options.only === true;
    return this;
  },


  // Adds a `distinct` clause to the query.
  distinct: function distinct() {
    this._statements.push({
      grouping: 'columns',
      value: helpers.normalizeArr.apply(null, arguments),
      distinct: true
    });
    return this;
  },


  // Adds a join clause to the query, allowing for advanced joins
  // with an anonymous function as the second argument.
  // function(table, first, operator, second)
  join: function join(table, first) {
    var join = void 0;
    var schema = this._single.schema;

    var joinType = this._joinType();
    if (typeof first === 'function') {
      join = new _joinclause2.default(table, joinType, schema);
      first.call(join, join);
    } else if (joinType === 'raw') {
      join = new _joinclause2.default(this.client.raw(table, first), 'raw');
    } else {
      join = new _joinclause2.default(table, joinType, schema);
      if (arguments.length > 1) {
        join.on.apply(join, (0, _toArray3.default)(arguments).slice(1));
      }
    }
    this._statements.push(join);
    return this;
  },


  // JOIN blocks:
  innerJoin: function innerJoin() {
    return this._joinType('inner').join.apply(this, arguments);
  },
  leftJoin: function leftJoin() {
    return this._joinType('left').join.apply(this, arguments);
  },
  leftOuterJoin: function leftOuterJoin() {
    return this._joinType('left outer').join.apply(this, arguments);
  },
  rightJoin: function rightJoin() {
    return this._joinType('right').join.apply(this, arguments);
  },
  rightOuterJoin: function rightOuterJoin() {
    return this._joinType('right outer').join.apply(this, arguments);
  },
  outerJoin: function outerJoin() {
    return this._joinType('outer').join.apply(this, arguments);
  },
  fullOuterJoin: function fullOuterJoin() {
    return this._joinType('full outer').join.apply(this, arguments);
  },
  crossJoin: function crossJoin() {
    return this._joinType('cross').join.apply(this, arguments);
  },
  joinRaw: function joinRaw() {
    return this._joinType('raw').join.apply(this, arguments);
  },


  // The where function can be used in several ways:
  // The most basic is `where(key, value)`, which expands to
  // where key = value.
  where: function where(column, operator, value) {

    // Support "where true || where false"
    if (column === false || column === true) {
      return this.where(1, '=', column ? 1 : 0);
    }

    // Check if the column is a function, in which case it's
    // a where statement wrapped in parens.
    if (typeof column === 'function') {
      return this.whereWrapped(column);
    }

    // Allow a raw statement to be passed along to the query.
    if (column instanceof _raw2.default && arguments.length === 1) return this.whereRaw(column);

    // Allows `where({id: 2})` syntax.
    if ((0, _isObject3.default)(column) && !(column instanceof _raw2.default)) return this._objectWhere(column);

    // Enable the where('key', value) syntax, only when there
    // are explicitly two arguments passed, so it's not possible to
    // do where('key', '!=') and have that turn into where key != null
    if (arguments.length === 2) {
      value = operator;
      operator = '=';

      // If the value is null, and it's a two argument query,
      // we assume we're going for a `whereNull`.
      if (value === null) {
        return this.whereNull(column);
      }
    }

    // lower case the operator for comparison purposes
    var checkOperator = ('' + operator).toLowerCase().trim();

    // If there are 3 arguments, check whether 'in' is one of them.
    if (arguments.length === 3) {
      if (checkOperator === 'in' || checkOperator === 'not in') {
        return this._not(checkOperator === 'not in').whereIn(arguments[0], arguments[2]);
      }
      if (checkOperator === 'between' || checkOperator === 'not between') {
        return this._not(checkOperator === 'not between').whereBetween(arguments[0], arguments[2]);
      }
    }

    // If the value is still null, check whether they're meaning
    // where value is null
    if (value === null) {

      // Check for .where(key, 'is', null) or .where(key, 'is not', 'null');
      if (checkOperator === 'is' || checkOperator === 'is not') {
        return this._not(checkOperator === 'is not').whereNull(column);
      }
    }

    // Push onto the where statement stack.
    this._statements.push({
      grouping: 'where',
      type: 'whereBasic',
      column: column,
      operator: operator,
      value: value,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },

  // Adds an `or where` clause to the query.
  orWhere: function orWhere() {
    this._bool('or');
    var obj = arguments[0];
    if ((0, _isObject3.default)(obj) && !(0, _isFunction3.default)(obj) && !(obj instanceof _raw2.default)) {
      return this.whereWrapped(function () {
        for (var key in obj) {
          this.andWhere(key, obj[key]);
        }
      });
    }
    return this.where.apply(this, arguments);
  },

  // Adds an `not where` clause to the query.
  whereNot: function whereNot() {
    return this._not(true).where.apply(this, arguments);
  },


  // Adds an `or not where` clause to the query.
  orWhereNot: function orWhereNot() {
    return this._bool('or').whereNot.apply(this, arguments);
  },


  // Processes an object literal provided in a "where" clause.
  _objectWhere: function _objectWhere(obj) {
    var boolVal = this._bool();
    var notVal = this._not() ? 'Not' : '';
    for (var key in obj) {
      this[boolVal + 'Where' + notVal](key, obj[key]);
    }
    return this;
  },


  // Adds a raw `where` clause to the query.
  whereRaw: function whereRaw(sql, bindings) {
    var raw = sql instanceof _raw2.default ? sql : this.client.raw(sql, bindings);
    this._statements.push({
      grouping: 'where',
      type: 'whereRaw',
      value: raw,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },
  orWhereRaw: function orWhereRaw(sql, bindings) {
    return this._bool('or').whereRaw(sql, bindings);
  },


  // Helper for compiling any advanced `where` queries.
  whereWrapped: function whereWrapped(callback) {
    this._statements.push({
      grouping: 'where',
      type: 'whereWrapped',
      value: callback,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },


  // Adds a `where exists` clause to the query.
  whereExists: function whereExists(callback) {
    this._statements.push({
      grouping: 'where',
      type: 'whereExists',
      value: callback,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },


  // Adds an `or where exists` clause to the query.
  orWhereExists: function orWhereExists(callback) {
    return this._bool('or').whereExists(callback);
  },


  // Adds a `where not exists` clause to the query.
  whereNotExists: function whereNotExists(callback) {
    return this._not(true).whereExists(callback);
  },


  // Adds a `or where not exists` clause to the query.
  orWhereNotExists: function orWhereNotExists(callback) {
    return this._bool('or').whereNotExists(callback);
  },


  // Adds a `where in` clause to the query.
  whereIn: function whereIn(column, values) {
    if (Array.isArray(values) && (0, _isEmpty3.default)(values)) return this.where(this._not());
    this._statements.push({
      grouping: 'where',
      type: 'whereIn',
      column: column,
      value: values,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },


  // Adds a `or where in` clause to the query.
  orWhereIn: function orWhereIn(column, values) {
    return this._bool('or').whereIn(column, values);
  },


  // Adds a `where not in` clause to the query.
  whereNotIn: function whereNotIn(column, values) {
    return this._not(true).whereIn(column, values);
  },


  // Adds a `or where not in` clause to the query.
  orWhereNotIn: function orWhereNotIn(column, values) {
    return this._bool('or')._not(true).whereIn(column, values);
  },


  // Adds a `where null` clause to the query.
  whereNull: function whereNull(column) {
    this._statements.push({
      grouping: 'where',
      type: 'whereNull',
      column: column,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },


  // Adds a `or where null` clause to the query.
  orWhereNull: function orWhereNull(column) {
    return this._bool('or').whereNull(column);
  },


  // Adds a `where not null` clause to the query.
  whereNotNull: function whereNotNull(column) {
    return this._not(true).whereNull(column);
  },


  // Adds a `or where not null` clause to the query.
  orWhereNotNull: function orWhereNotNull(column) {
    return this._bool('or').whereNotNull(column);
  },


  // Adds a `where between` clause to the query.
  whereBetween: function whereBetween(column, values) {
    (0, _assert2.default)(Array.isArray(values), 'The second argument to whereBetween must be an array.');
    (0, _assert2.default)(values.length === 2, 'You must specify 2 values for the whereBetween clause');
    this._statements.push({
      grouping: 'where',
      type: 'whereBetween',
      column: column,
      value: values,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },


  // Adds a `where not between` clause to the query.
  whereNotBetween: function whereNotBetween(column, values) {
    return this._not(true).whereBetween(column, values);
  },


  // Adds a `or where between` clause to the query.
  orWhereBetween: function orWhereBetween(column, values) {
    return this._bool('or').whereBetween(column, values);
  },


  // Adds a `or where not between` clause to the query.
  orWhereNotBetween: function orWhereNotBetween(column, values) {
    return this._bool('or').whereNotBetween(column, values);
  },


  // Adds a `group by` clause to the query.
  groupBy: function groupBy(item) {
    if (item instanceof _raw2.default) {
      return this.groupByRaw.apply(this, arguments);
    }
    this._statements.push({
      grouping: 'group',
      type: 'groupByBasic',
      value: helpers.normalizeArr.apply(null, arguments)
    });
    return this;
  },


  // Adds a raw `group by` clause to the query.
  groupByRaw: function groupByRaw(sql, bindings) {
    var raw = sql instanceof _raw2.default ? sql : this.client.raw(sql, bindings);
    this._statements.push({
      grouping: 'group',
      type: 'groupByRaw',
      value: raw
    });
    return this;
  },


  // Adds a `order by` clause to the query.
  orderBy: function orderBy(column, direction) {
    this._statements.push({
      grouping: 'order',
      type: 'orderByBasic',
      value: column,
      direction: direction
    });
    return this;
  },


  // Add a raw `order by` clause to the query.
  orderByRaw: function orderByRaw(sql, bindings) {
    var raw = sql instanceof _raw2.default ? sql : this.client.raw(sql, bindings);
    this._statements.push({
      grouping: 'order',
      type: 'orderByRaw',
      value: raw
    });
    return this;
  },


  // Add a union statement to the query.
  union: function union(callbacks, wrap) {
    if (arguments.length === 1 || arguments.length === 2 && (0, _isBoolean3.default)(wrap)) {
      if (!Array.isArray(callbacks)) {
        callbacks = [callbacks];
      }
      for (var i = 0, l = callbacks.length; i < l; i++) {
        this._statements.push({
          grouping: 'union',
          clause: 'union',
          value: callbacks[i],
          wrap: wrap || false
        });
      }
    } else {
      callbacks = (0, _toArray3.default)(arguments).slice(0, arguments.length - 1);
      wrap = arguments[arguments.length - 1];
      if (!(0, _isBoolean3.default)(wrap)) {
        callbacks.push(wrap);
        wrap = false;
      }
      this.union(callbacks, wrap);
    }
    return this;
  },


  // Adds a union all statement to the query.
  unionAll: function unionAll(callback, wrap) {
    this._statements.push({
      grouping: 'union',
      clause: 'union all',
      value: callback,
      wrap: wrap || false
    });
    return this;
  },


  // Adds a `having` clause to the query.
  having: function having(column, operator, value) {
    if (column instanceof _raw2.default && arguments.length === 1) {
      return this.havingRaw(column);
    }

    // Check if the column is a function, in which case it's
    // a having statement wrapped in parens.
    if (typeof column === 'function') {
      return this.havingWrapped(column);
    }

    this._statements.push({
      grouping: 'having',
      type: 'havingBasic',
      column: column,
      operator: operator,
      value: value,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  },


  orHaving: function orHaving() {
    this._bool('or');
    var obj = arguments[0];
    if ((0, _isObject3.default)(obj) && !(0, _isFunction3.default)(obj) && !(obj instanceof _raw2.default)) {
      return this.havingWrapped(function () {
        for (var key in obj) {
          this.andHaving(key, obj[key]);
        }
      });
    }
    return this.having.apply(this, arguments);
  },

  // Helper for compiling any advanced `having` queries.
  havingWrapped: function havingWrapped(callback) {
    this._statements.push({
      grouping: 'having',
      type: 'havingWrapped',
      value: callback,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  },
  havingNull: function havingNull(column) {
    this._statements.push({
      grouping: 'having',
      type: 'havingNull',
      column: column,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },
  orHavingNull: function orHavingNull(callback) {
    return this._bool('or').havingNull(callback);
  },
  havingNotNull: function havingNotNull(callback) {
    return this._not(true).havingNull(callback);
  },
  orHavingNotNull: function orHavingNotNull(callback) {
    return this._not(true)._bool('or').havingNull(callback);
  },
  havingExists: function havingExists(callback) {
    this._statements.push({
      grouping: 'having',
      type: 'havingExists',
      value: callback,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },
  orHavingExists: function orHavingExists(callback) {
    return this._bool('or').havingExists(callback);
  },
  havingNotExists: function havingNotExists(callback) {
    return this._not(true).havingExists(callback);
  },
  orHavingNotExists: function orHavingNotExists(callback) {
    return this._not(true)._bool('or').havingExists(callback);
  },
  havingBetween: function havingBetween(column, values) {
    (0, _assert2.default)(Array.isArray(values), 'The second argument to havingBetween must be an array.');
    (0, _assert2.default)(values.length === 2, 'You must specify 2 values for the havingBetween clause');
    this._statements.push({
      grouping: 'having',
      type: 'havingBetween',
      column: column,
      value: values,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },
  orHavingBetween: function orHavingBetween(column, values) {
    return this._bool('or').havingBetween(column, values);
  },
  havingNotBetween: function havingNotBetween(column, values) {
    return this._not(true).havingBetween(column, values);
  },
  orHavingNotBetween: function orHavingNotBetween(column, values) {
    return this._not(true)._bool('or').havingBetween(column, values);
  },
  havingIn: function havingIn(column, values) {
    if (Array.isArray(values) && (0, _isEmpty3.default)(values)) return this.where(this._not());
    this._statements.push({
      grouping: 'having',
      type: 'havingIn',
      column: column,
      value: values,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },


  // Adds a `or where in` clause to the query.
  orHavingIn: function orHavingIn(column, values) {
    return this._bool('or').havingIn(column, values);
  },


  // Adds a `where not in` clause to the query.
  havingNotIn: function havingNotIn(column, values) {
    return this._not(true).havingIn(column, values);
  },


  // Adds a `or where not in` clause to the query.
  orHavingNotIn: function orHavingNotIn(column, values) {
    return this._bool('or')._not(true).havingIn(column, values);
  },


  // Adds a raw `having` clause to the query.
  havingRaw: function havingRaw(sql, bindings) {
    var raw = sql instanceof _raw2.default ? sql : this.client.raw(sql, bindings);
    this._statements.push({
      grouping: 'having',
      type: 'havingRaw',
      value: raw,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  },
  orHavingRaw: function orHavingRaw(sql, bindings) {
    return this._bool('or').havingRaw(sql, bindings);
  },


  // Only allow a single "offset" to be set for the current query.
  offset: function offset(value) {
    this._single.offset = value;
    return this;
  },


  // Only allow a single "limit" to be set for the current query.
  limit: function limit(value) {
    var val = parseInt(value, 10);
    if (isNaN(val)) {
      helpers.warn('A valid integer must be provided to limit');
    } else {
      this._single.limit = val;
    }
    return this;
  },


  // Retrieve the "count" result of the query.
  count: function count(column) {
    return this._aggregate('count', column || '*');
  },


  // Retrieve the minimum value of a given column.
  min: function min(column) {
    return this._aggregate('min', column);
  },


  // Retrieve the maximum value of a given column.
  max: function max(column) {
    return this._aggregate('max', column);
  },


  // Retrieve the sum of the values of a given column.
  sum: function sum(column) {
    return this._aggregate('sum', column);
  },


  // Retrieve the average of the values of a given column.
  avg: function avg(column) {
    return this._aggregate('avg', column);
  },


  // Retrieve the "count" of the distinct results of the query.
  countDistinct: function countDistinct(column) {
    return this._aggregate('count', column || '*', true);
  },


  // Retrieve the sum of the distinct values of a given column.
  sumDistinct: function sumDistinct(column) {
    return this._aggregate('sum', column, true);
  },


  // Retrieve the vg of the distinct results of the query.
  avgDistinct: function avgDistinct(column) {
    return this._aggregate('avg', column, true);
  },


  // Increments a column's value by the specified amount.
  increment: function increment(column, amount) {
    return this._counter(column, amount);
  },


  // Decrements a column's value by the specified amount.
  decrement: function decrement(column, amount) {
    return this._counter(column, amount, '-');
  },


  // Sets the values for a `select` query, informing that only the first
  // row should be returned (limit 1).
  first: function first() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    this.select.apply(this, args);
    this._method = 'first';
    this.limit(1);
    return this;
  },


  // Pluck a column from a query.
  pluck: function pluck(column) {
    this._method = 'pluck';
    this._single.pluck = column;
    this._statements.push({
      grouping: 'columns',
      type: 'pluck',
      value: column
    });
    return this;
  },


  // Insert & Update
  // ------

  // Sets the values for an `insert` query.
  insert: function insert(values, returning) {
    this._method = 'insert';
    if (!(0, _isEmpty3.default)(returning)) this.returning(returning);
    this._single.insert = values;
    return this;
  },


  // Sets the values for an `update`, allowing for both
  // `.update(key, value, [returning])` and `.update(obj, [returning])` syntaxes.
  update: function update(values, returning) {
    var ret = void 0;
    var obj = this._single.update || {};
    this._method = 'update';
    if ((0, _isString3.default)(values)) {
      obj[values] = returning;
      if (arguments.length > 2) {
        ret = arguments[2];
      }
    } else {
      var keys = (0, _keys2.default)(values);
      if (this._single.update) {
        helpers.warn('Update called multiple times with objects.');
      }
      var i = -1;
      while (++i < keys.length) {
        obj[keys[i]] = values[keys[i]];
      }
      ret = arguments[1];
    }
    if (!(0, _isEmpty3.default)(ret)) this.returning(ret);
    this._single.update = obj;
    return this;
  },


  // Sets the returning value for the query.
  returning: function returning(_returning) {
    this._single.returning = _returning;
    return this;
  },


  // Delete
  // ------

  // Executes a delete statement on the query;
  delete: function _delete(ret) {
    this._method = 'del';
    if (!(0, _isEmpty3.default)(ret)) this.returning(ret);
    return this;
  },


  // Truncates a table, ends the query chain.
  truncate: function truncate(tableName) {
    this._method = 'truncate';
    if (tableName) {
      this._single.table = tableName;
    }
    return this;
  },


  // Retrieves columns for the table specified by `knex(tableName)`
  columnInfo: function columnInfo(column) {
    this._method = 'columnInfo';
    this._single.columnInfo = column;
    return this;
  },


  // Set a lock for update constraint.
  forUpdate: function forUpdate() {
    this._single.lock = 'forUpdate';
    return this;
  },


  // Set a lock for share constraint.
  forShare: function forShare() {
    this._single.lock = 'forShare';
    return this;
  },


  // Takes a JS object of methods to call and calls them
  fromJS: function fromJS(obj) {
    var _this = this;

    (0, _each3.default)(obj, function (val, key) {
      if (typeof _this[key] !== 'function') {
        helpers.warn('Knex Error: unknown key ' + key);
      }
      if (Array.isArray(val)) {
        _this[key].apply(_this, val);
      } else {
        _this[key](val);
      }
    });
    return this;
  },


  // Passes query to provided callback function, useful for e.g. composing
  // domain-specific helpers
  modify: function modify(callback) {
    callback.apply(this, [this].concat((0, _tail3.default)(arguments)));
    return this;
  },


  // ----------------------------------------------------------------------

  // Helper for the incrementing/decrementing queries.
  _counter: function _counter(column, amount, symbol) {
    var amt = parseInt(amount, 10);
    if (isNaN(amt)) amt = 1;
    this._method = 'counter';
    this._single.counter = {
      column: column,
      amount: amt,
      symbol: symbol || '+'
    };
    return this;
  },


  // Helper to get or set the "boolFlag" value.
  _bool: function _bool(val) {
    if (arguments.length === 1) {
      this._boolFlag = val;
      return this;
    }
    var ret = this._boolFlag;
    this._boolFlag = 'and';
    return ret;
  },


  // Helper to get or set the "notFlag" value.
  _not: function _not(val) {
    if (arguments.length === 1) {
      this._notFlag = val;
      return this;
    }
    var ret = this._notFlag;
    this._notFlag = false;
    return ret;
  },


  // Helper to get or set the "joinFlag" value.
  _joinType: function _joinType(val) {
    if (arguments.length === 1) {
      this._joinFlag = val;
      return this;
    }
    var ret = this._joinFlag || 'inner';
    this._joinFlag = 'inner';
    return ret;
  },


  // Helper for compiling any aggregate queries.
  _aggregate: function _aggregate(method, column, aggregateDistinct) {
    this._statements.push({
      grouping: 'columns',
      type: 'aggregate',
      method: method,
      value: column,
      aggregateDistinct: aggregateDistinct || false
    });
    return this;
  }
});

Object.defineProperty(Builder.prototype, 'or', {
  get: function get() {
    return this._bool('or');
  }
});

Object.defineProperty(Builder.prototype, 'not', {
  get: function get() {
    return this._not(true);
  }
});

Builder.prototype.select = Builder.prototype.columns;
Builder.prototype.column = Builder.prototype.columns;
Builder.prototype.andWhereNot = Builder.prototype.whereNot;
Builder.prototype.andWhere = Builder.prototype.where;
Builder.prototype.andWhereRaw = Builder.prototype.whereRaw;
Builder.prototype.andWhereBetween = Builder.prototype.whereBetween;
Builder.prototype.andWhereNotBetween = Builder.prototype.whereNotBetween;
Builder.prototype.andHaving = Builder.prototype.having;
Builder.prototype.andHavingIn = Builder.prototype.havingIn;
Builder.prototype.andHavingNotIn = Builder.prototype.havingNotIn;
Builder.prototype.andHavingNull = Builder.prototype.havingNull;
Builder.prototype.andHavingNotNull = Builder.prototype.havingNotNull;
Builder.prototype.andHavingExists = Builder.prototype.havingExists;
Builder.prototype.andHavingNotExists = Builder.prototype.havingNotExists;
Builder.prototype.andHavingBetween = Builder.prototype.havingBetween;
Builder.prototype.andHavingNotBetween = Builder.prototype.havingNotBetween;
Builder.prototype.from = Builder.prototype.table;
Builder.prototype.into = Builder.prototype.table;
Builder.prototype.del = Builder.prototype.delete;

// Attach all of the top level promise methods that should be chainable.
require('../interface')(Builder);

exports.default = Builder;
module.exports = exports['default'];