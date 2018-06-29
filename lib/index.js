const Mysql = require('./mysql')
const Model = require('./model')
const Utils = require('./utils')
const Promise = require('./promise')
const Hooks = require('./hooks')

class Orm {
    constructor(database, username, password, options) {

        let config = {database, username, password}

        this.options = Object.assign({
            host: 'localhost',
            protocol: 'tcp',
            charset: 'utf8',
            ssl: undefined,
            pool: {},
            hooks: {},
            sync: {},
            debug: false
        }, options)

        this.config = {
            database: config.database,
            username: config.username,
            password: config.password,
            host: config.host || this.options.host,
            port: config.port || this.options.port,
            charset: config.charset || this.options.charset,
            pool: this.options.pool,
            protocol: this.options.protocol,
            ssl: this.options.ssl
        }
        
        this.models = {}
    }
    // 模型定义
    define(modelName, attributes, options = {}) {

        options.modelName = modelName
        options.orm = this

        const model = class extends Model {}

        model.init(attributes, options)

        this.models[modelName] = model

        return model
    }

    isDefined(modelName) {
        return !!this.models[modelName]
    }

    getQueryInterface() {
        this.queryInterface = this.queryInterface || new Mysql(this)
        return this.queryInterface
    }
    // 数据表重建
    drop(options) {
        const models = Object.keys(this.models).map(key => {
            return this.models[key]
        })
        return Promise.each(models, model => model.drop(options))
    }
    // 同步
    sync(options = {}) {
        options.hooks = options.hooks === undefined ? true : !!options.hooks

        return Promise.try(() => {
            if (options.hooks) {
                return this.runHooks('beforeBulkSync', options)
            }
        }).then(() => {
            if (options.force) {
                return this.drop(options)
            }
        }).then(() => {
            const models = Object.keys(this.models).map(key => {
                return this.models[key]
            })
            return Promise.each(models, model => model.sync(options))
        }).then(() => {
            if (options.hooks) {
                return this.runHooks('afterBulkSync', options)
            }
        }).return(this)
    }
}

Hooks.applyTo(Orm)
Hooks.applyTo(Orm.prototype)

module.exports = Orm