const Utils = require('./utils')
const Hooks = require('./hooks')
const Promise = require('./promise')
const Op = require('./operators')
const OperatorMap = Op.Map

class Model {

    constructor(values, options) {

    }

    static get QueryInterface() {
        return this.orm.getQueryInterface()
    }
    
    static init(attributes, options = {}) {

        if (!options.orm) {
            throw new Error('No Orm instance passed')
        }

        this.orm = options.orm
        
        options.modelName = options.modelName || options.name

        this.orm.runHooks('beforeDefine', attributes, options)

        if (options.modelName !== this.name) {
            Object.defineProperty(this, 'name', {value: options.modelName})
        }

        delete options.modelName

        this.options = Object.assign({}, options)

        if (this.orm.isDefined(this.name)) {
            delete this.orm.models[this.name]
        }

        this.associations = {}
        this._setupHooks(options.hooks)
        
        this.tableName = this.options.tableName || this.name

        this.rawAttributes = this.normalizeAttribute(attributes)

        this.primaryKeys = {}

        this.orm.models[this.name] = this
        this.orm.runHooks('afterDefine', this)


        return this
    }

    static sync(options) {
        options = Object.assign({}, this.options, options)

        const attributes = this.rawAttributes

        return Promise.try(() => {
            if (options.force) {
                return this.drop(options)
            }
        }).then(() => {
            return this.QueryInterface.createTable(this.tableName, attributes, options)
        }).return(this)
    }

    static drop(options) {
        return this.QueryInterface.dropTable(this.tableName)
    }

    static create(_values) {
        let values = Utils.copy(_values, true)
        return Promise.try(() => {
            values.isNewRecord = true
            this.runHooks('beforeValidate', values, this.options)
        }).then(() => {
            // 插值过滤
            values = Utils.pick(values, Object.keys(this.rawAttributes).map(key => this.rawAttributes[key].name).filter(item => (item !== null && item !== undefined)))
            return this.QueryInterface.create(this.tableName, values)
        })
    }

    static createMultiple(values) {
        return Promise.try(() => {
            this.runHooks('beforeValidate', values, this.options)
        }).then(() => {
            // 插值过滤
            values = values.map(value => {
                return Utils.pick(value, Object.keys(this.rawAttributes).map(key => this.rawAttributes[key].name).filter(item => (item !== null && item !== undefined)))
            })
            return this.QueryInterface.createMultiple(this.tableName, values)
        })
    }

    static update(_values, _options) {
        let options = Utils.copy(_options, true)
        let values = Utils.copy(_values, true)
        return Promise.try(() => {
            values.isNewRecord = false
            this.runHooks('beforeValidate', values, this.options)
            if (options.where) {
                options.where = this.whereQuery(options.where)
            }
            return options
        }).then(() => {
            delete values.id
            // 插值过滤
            values = Utils.pick(values, Object.keys(this.rawAttributes).map(key => this.rawAttributes[key].name).filter(item => (item !== null && item !== undefined)))
            return this.QueryInterface.update(this.tableName, values, options)
        })
    }

    static updateMultiple(values, ids, _options = {}) {
        let options = Utils.copy(_options, true)
        return Promise.try(() => {
            this.runHooks('beforeValidate', values, this.options)
        }).then(() => {
            // 插值过滤
            values = values.map(value => {
                delete value.id
                return Utils.pick(value, Object.keys(this.rawAttributes).map(key => this.rawAttributes[key].name).filter(item => (item !== null && item !== undefined)))
            })
            return this.QueryInterface.updateMultiple(this.tableName, values, ids, options)
        })
    }

    static destroy(_options) {
        let options = Utils.copy(_options, true)
        return Promise.try(() => {
            if (options.where) {
                options.where = this.whereQuery(options.where)
            }
            return options            
        }).then(() => {
            return this.QueryInterface.destroy(this.tableName, options)
        })
    }

    static findById(id, _options = {}) {
        let options = Utils.copy(_options, true)
        return Promise.try(() => {
            if (options.attributes) {
                let attr = options.attributes
                if (!Array.isArray(attr) && Utils.isString(attr)) {
                    attr = attr.split(',')
                }
                // 过滤不存在的参数
                options.attributes = []
                let keys = Object.keys(this.rawAttributes).map(key => this.rawAttributes[key].name).filter(item => (item !== null && item !== undefined))
                attr.forEach(key => {
                    if (keys.indexOf(key) !== -1) {
                        options.attributes.push(key)
                    }
                })
            }            
            return this.QueryInterface.findById(this.tableName, id, options)
        }).then(res => {
            return res[0]
        })
    }

    static findOne(_options) {
        let options = Utils.copy(_options, true)
        return Promise.try(() => {
            if (options.where) {
                options.where = this.whereQuery(options.where)
            }
            if (options.attributes) {
                let attr = options.attributes
                if (!Array.isArray(attr) && Utils.isString(attr)) {
                    attr = attr.split(',')
                }
                // 过滤不存在的参数
                options.attributes = []
                let keys = Object.keys(this.rawAttributes).map(key => this.rawAttributes[key].name).filter(item => (item !== null && item !== undefined))
                attr.forEach(key => {
                    if (keys.indexOf(key) !== -1) {
                        options.attributes.push(key)
                    }
                })
            }       
            return options
        }).then(() => {
            return this.QueryInterface.findOne(this.tableName, options)
        }).then(res => {
            return res[0]
        })
    }

    static findAll(_options) {
        let options = Utils.copy(_options, true)
        return Promise.try(() => {
            if (options.where) {
                options.where = this.whereQuery(options.where)
            }
            if (options.attributes) {
                let attr = options.attributes
                if (!Array.isArray(attr) && Utils.isString(attr)) {
                    attr = attr.split(',')
                }
                // 过滤不存在的参数
                options.attributes = []
                let keys = Object.keys(this.rawAttributes).map(key => this.rawAttributes[key].name).filter(item => (item !== null && item !== undefined))
                attr.forEach(key => {
                    if (keys.indexOf(key) !== -1) {
                        options.attributes.push(key)
                    }
                })
            }       
            return options
        }).then(() => {
            return this.QueryInterface.findAll(this.tableName, options)
        })
    }

    static count(_options) {
        let options = Utils.copy(_options, true)
        return Promise.try(() => {
            if (options.where) {
                options.where = this.whereQuery(options.where)
            }
            return options            
        }).then(() => {
            return this.QueryInterface.count(this.tableName, options)
        }).then(result => {
            if ( Array.isArray(result) && result.length > 0 ) {
                result = result[0]['COUNT(*)']
            } else {
                result = null
            }
            return result
        })
    }

    static query(sql) {
        return Promise.try(() => {
            return this.QueryInterface.query(sql)
        })
    }

    static normalizeAttribute(attributes) {
        return Utils.mapValues(attributes, (attribute, name) => {
            if (Utils.isString(attribute)) {
                attribute = {
                    name: name,
                    type: attribute
                }
            } else if (Utils.isObject(attribute)) {
                if (!attribute.name) {
                    attribute = {
                        name: name,
                        ...attribute
                    }
                }
            }
            return attribute
        })
    }

    static whereQuery(where) {
        const query = this.whereItemsQuery(where)
        if (query && query.length) {
            return 'WHERE ' + query
        }
        return ''
    }

    static whereItemsQuery(where, binding) {
        if (where === null || where === undefined) {
          return ''
        }
    
        if (Utils.isString(where)) {
          throw new Error('Support for `{where: \'raw query\'}` has been removed.')
        }
    
        const items = []
    
        binding = binding || 'AND'
        if (binding.substr(0, 1) !== ' ') binding = ` ${binding} `
    
        if (Utils.isObject(where)) {
            Utils.mapValues(where, (v, k) => {
                items.push(this.whereItemQuery(k, v))
            })
        } else {
            items.push(this.whereItemQuery(undefined, where))
        }
        return items.length && items.filter(item => item && item.length).join(binding) || ''
    }

    static whereItemQuery(key, value) {
        const isObject = Utils.isObject(value)
        const isArray = !isObject && Array.isArray(value)
        key = Op[key] || Op.Aliases[key] || key
        if (isObject) {
            value = this.replaceAliases(value)
        }
        const valueKeys = isObject && Object.getOwnPropertySymbols(value)

        if (key === undefined) {
            if (Utils.isString(value)) {
                return value
            }
            if (isObject && valueKeys.length === 1) {
                return this.whereItemQuery(valueKeys[0], value[valueKeys[0]])
            }
        }
        if (key === Op.or || key === Op.and || key === Op.not) {
            return this.whereGroupBind(key, value)
        }
        if (value[Op.or]) {
            return this.whereBind(OperatorMap[Op.or], key, value[Op.or])
        }      
        if (value[Op.and]) {
            return this.whereBind(OperatorMap[Op.and], key, value[Op.and])
        }
        if (isObject && valueKeys.length > 1) {
            return this.whereBind(OperatorMap[Op.and], key, value)
          }

        if (isObject) {
            if (OperatorMap[valueKeys[0]]) {
                let tempValue = value[valueKeys[0]]
                return `${key} ${OperatorMap[valueKeys[0]]} ${Array.isArray(tempValue) ? '(' + tempValue.join(',') + ')' : tempValue}`
            } else {
                console.log(key, value, valueKeys)
                console.log('暂未想到的情况发生了。。。')
            }
        }
        return this.joinKeyValue(key, value, OperatorMap[Op.eq])
    }

    static joinKeyValue(key, value, comparator) {
        if (!key) {
            return value
        }
        if (comparator === undefined) {
            throw new Error(`${key} and ${value} has no comperator`)
        }
        value = Utils.isString(value) ? `\'${value}\'` : value
        return [key, value].join(' '+comparator+' ')
    }

    static whereGroupBind(key, value) {
        const binding = key === Op.or ? OperatorMap[Op.or] : OperatorMap[Op.and]
        const outerBinding = key === Op.not ? 'NOT ' : ''

        if (Array.isArray(value)) {
            value = value.map(item => {
                let itemQuery = this.whereItemsQuery(item, OperatorMap[Op.and])
                if (itemQuery && itemQuery.length) {
                  itemQuery = `(${itemQuery})`
                }
                return itemQuery
            }).filter(item => item && item.length)
            value = value.length && value.join(binding)
        } else {
            value = this.whereItemsQuery(value, binding)
        }
        return value ? `${outerBinding}(${value})` : undefined
    }

    static whereBind(binding, key, value) {
        if (Utils.isObject(value)) {
            value = Object.keys(value).map(key => {
                return this.whereItemQuery(key, value[key])
            })
        } else {
            value = value.map(item => this.whereItemQuery(key, item))
        }
        value = value.filter(item => item && item.length)
    
        return value.length ? `(${value.join(binding)})` : undefined
    }

    static replaceAliases(obj) {
        const values = {}
        
        Utils.mapKeys(obj, (value, key) => {
            key = Op[key] || Op.Aliases[key] || key
            if (Utils.isObject(value)) {
                value = this.replaceAliases(value)
            }
            values[key] = value
        })
        
        return values
    }
}

Hooks.applyTo(Model)

module.exports = Model