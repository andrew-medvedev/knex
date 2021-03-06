'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Promise = require('bluebird');
var Transaction = require('../../transaction');
var debugTx = require('debug')('knex:tx');

var Oracle_Transaction = function (_Transaction) {
  (0, _inherits3.default)(Oracle_Transaction, _Transaction);

  function Oracle_Transaction() {
    (0, _classCallCheck3.default)(this, Oracle_Transaction);
    return (0, _possibleConstructorReturn3.default)(this, (Oracle_Transaction.__proto__ || (0, _getPrototypeOf2.default)(Oracle_Transaction)).apply(this, arguments));
  }

  (0, _createClass3.default)(Oracle_Transaction, [{
    key: 'begin',


    // disable autocommit to allow correct behavior (default is true)
    value: function begin() {
      return Promise.resolve();
    }
  }, {
    key: 'commit',
    value: function commit(conn, value) {
      this._completed = true;
      return conn.commitAsync().return(value).then(this._resolver, this._rejecter);
    }
  }, {
    key: 'release',
    value: function release(conn, value) {
      return this._resolver(value);
    }
  }, {
    key: 'rollback',
    value: function rollback(conn, err) {
      var self = this;
      this._completed = true;
      debugTx('%s: rolling back', this.txid);
      return conn.rollbackAsync().timeout(5000).catch(Promise.TimeoutError, function (e) {
        self._rejecter(e);
      }).then(function () {
        self._rejecter(err);
      });
    }
  }, {
    key: 'savepoint',
    value: function savepoint(conn) {
      return this.query(conn, 'SAVEPOINT ' + this.txid);
    }
  }, {
    key: 'acquireConnection',
    value: function acquireConnection(config) {
      var t = this;
      return Promise.try(function () {
        return t.client.acquireConnection().then(function (cnx) {
          cnx.isTransaction = true;
          return cnx;
        });
      }).disposer(function (connection) {
        debugTx('%s: releasing connection', t.txid);
        connection.isTransaction = false;
        connection.commitAsync().then(function (err) {
          if (err) {
            this._rejecter(err);
          }
          if (!config.connection) {
            t.client.releaseConnection(connection);
          } else {
            debugTx('%s: not releasing external connection', t.txid);
          }
        });
      });
    }
  }]);
  return Oracle_Transaction;
}(Transaction);

exports.default = Oracle_Transaction;
module.exports = exports['default'];