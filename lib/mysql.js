const mysql = require('mysql')
const Utils = require('./utils')

class Mysql {
    constructor(orm) {
        const config = orm.config
        this.orm = orm
        this.pool = mysql.createPool({
            host:       config.host,
            port:       config.port,
            user:       config.username,
            password:   config.password,
            database:   config.database,
            charset:    config.charset
        })
    }

    query( sql, values ) {
        this.orm.options.debug && console.log(sql)
        return new Promise(( resolve, reject ) => {
            this.pool.getConnection(function(err, connection) {
                if (err) {
                    resolve( err )
                } else {
                    connection.query(sql, values, ( err, rows) => {
                        if ( err ) {
                            reject( err )
                        } else {
                            resolve( rows )
                        }
                        connection.release()
                    })
                }
            })
        })
    }

    createTable( tableName, attributes, options ) {
        options = Object.assign({
            engine: 'InnoDB',
            charset: config.charset || 'utf8mb4',
            rowFormat: null
        }, options)

        const query = 'CREATE TABLE IF NOT EXISTS <%= data.table %> (<%= data.attributes %>) ENGINE=<%= data.engine %><%= data.charset %><%= data.collation %><%= data.initialAutoIncrement %><%= data.rowFormat %><%= data.comment %>'
        let attrStr = []
        let indexKeys = []
        let primaryKey = ''
        let indexKey = ''
        let indexes = attributes.indexes
        delete attributes.indexes
        Utils.mapValues(attributes, (attr, key) => {
            let template = `\`${attr.name}\` ${attr.type}`
            
            if (!attr.allowNull) {
                template += ` NOT NULL`
            }
            if (attr.defaultValue !== undefined) {
                template += ` DEFAULT '${attr.defaultValue}'`
            } else if (attr.allowNull) {
                template += ` DEFAULT NULL`
            }
            if (attr.autoIncrement) {
                template += ` AUTO_INCREMENT`
            }
            if (attr.comment) {
                template += ` COMMENT '${attr.comment}'`
            }
            if (attr.primaryKey) {
                primaryKey = ` PRIMARY KEY (\`${attr.name}\`)`
            }
            // 简版索引声明
            if (attr.unique) {
                if (attr.unique === true) {
                    indexKey = ` UNIQUE KEY \`${attr.name}\` (\`${attr.name}\`)`
                } else if (Utils.isString(attr.unique)) {
                    indexKey = ` UNIQUE KEY \`${attr.unique}\` (\`${attr.name}\`)`
                }
                indexKeys.push(indexKey)
            }          
            attrStr.push(template)
        })
        // 主键
        attrStr.push(primaryKey)
        // 索引
        if (indexes && Array.isArray(indexes)) {
            indexes.forEach(item => {
                if (!item.fields || !Array.isArray(item.fields)) return
                if (item.type) {
                    indexKey = ` ${item.type}`
                } else {
                    indexKey = ` KEY`
                }
                if (item.name) {
                    indexKey += ` \`${item.name}\``
                }
                let names = []
                item.fields.forEach(field => {
                    names.push(` \`${field}\``)
                })
                indexKey += ` (${names.join(',')})`
                if (item.method) {
                    indexKey += ` USING ${item.method}`
                }
                indexKeys.push(indexKey)
            })
        }
        if (indexKeys.length) {
            attrStr = attrStr.concat(indexKeys)
        }
        
        const values = {
            table: `\`${tableName}\``,
            attributes: attrStr.join(','),
            comment: options.comment ? ` COMMENT='${options.comment}'` : '',
            engine: options.engine,
            charset: options.charset ? ` DEFAULT CHARSET=${options.charset}` : '',
            collation: options.collate ? ` COLLATE ${options.collate}`: '',
            rowFormat: options.rowFormat ? ` ROW_FORMAT=${options.rowFormat}` : '',
            initialAutoIncrement: options.initialAutoIncrement ? ` AUTO_INCREMENT=${options.initialAutoIncrement}` : ''
        }

        const _sql = Utils.template(query, values)

        return this.query( _sql, [] )
    }

    dropTable( tableName ) {
        const _sql = `DROP TABLE IF EXISTS ${tableName}`
        return this.query( _sql, [] )
    }

    select( table, keys ) {
        let  _sql =  "SELECT ?? FROM ?? "
        return this.query( _sql, [ keys, table ] )
    }

    findById( tableName, id, {key = 'id', attributes} ) {
        let  _sql =  `SELECT * FROM ?? WHERE ${key} = ? `
        if (attributes) {
            attributes = Array.isArray(attributes) ? attributes.join(',') : attributes
            _sql = _sql.replace('*', attributes)
        }
        return this.query( _sql, [ tableName, id ] )
    }

    findAll( tableName, {where, attributes, order, limit, offset} ) {
        let  _sql =  "SELECT * FROM ??"
        if (attributes) {
            attributes = Array.isArray(attributes) ? attributes.join(',') : attributes
            _sql = _sql.replace('*', attributes)
        }
        if (where) _sql += ` ${where}`
        if (order) _sql += ` ORDER BY ${order}`
        if (limit) {
            _sql += ` LIMIT ${limit}`
            
            if (offset) {
                _sql += ` OFFSET ${offset}`
            }
        }
        return this.query( _sql, [ tableName ] )
    }

    findOne( tableName, {where, attributes, order} ) {
        let  _sql =  "SELECT * FROM ??"
        if (attributes) {
            attributes = Array.isArray(attributes) ? attributes.join(',') : attributes
            _sql = _sql.replace('*', attributes)
        }
        if (where) _sql += ` ${where}`
        if (order) _sql += ` ORDER BY ${order}`
        _sql += ' LIMIT 1'
        return this.query( _sql, [ tableName ] )
    }

    create( tableName, values ) {
        let _sql = "INSERT INTO ?? SET ?"
        return this.query( _sql, [ tableName, values ] )
    }

    createMultiple( tableName, values ) {
        let _sql = "INSERT INTO ??($keys) VALUES ?"
        let keys = []
        let vals = []
        values.forEach(item => {
            if (!keys.length) {
                keys = Object.keys(item)
            }                 
            let value = []     
            keys.forEach(key => {
                value.push(item[key])
            })
            vals.push(value)
        })
        _sql = _sql.replace('$keys', keys.map(item => `\`${item}\``).join(','))
        return this.query( _sql, [ tableName, vals ] )
    }

    update( tableName, values, {where} ) {
        let _sql = "UPDATE ?? SET ?"
        if (where) {
            _sql += ` ${where}`
        } else {
            throw new Error('Incorrect parameter')
        }        
        return this.query( _sql, [ tableName, values ] )
    }

    updateMultiple( tableName, values, ids, {key = 'id'} ) {
        let _sql = "UPDATE ?? SET $caseSQL $where"
        let where = `WHERE ${key} IN (${ids.join(',')})`
        let caseSQL = []
        let vals = {}
        let keys = []
        values.forEach(item => {
            if (!keys.length) {
                keys = Object.keys(item)
            }
            keys.forEach(k => {
                vals[k] = vals[k] || []
                vals[k].push(item[k])
            })
        })
        for (let k in vals) {
            let vs = vals[k]
            let sql = `${k} = CASE ${key}`
            vs.forEach((v, i) => {
                sql += ` WHEN ${ids[i]} THEN ${v}`
            })
            sql += ` END`
            caseSQL.push(sql)
        }
        _sql = _sql.replace('$caseSQL', caseSQL.join(',')).replace('$where', where)
        return this.query( _sql, [ tableName ] )
    }

    destroy( tableName, {where} ) {
        let _sql = "DELETE FROM ??"
        if (where) {
            _sql += ` ${where}`
        } else {
            throw new Error('Incorrect parameter')
        }        
        return this.query( _sql, [ tableName ] )
    }

    count( tableName, {where} ) {
        let  _sql =  "SELECT COUNT(*) FROM ?? "
        if (where) _sql += ` ${where}`
        return this.query( _sql, [ tableName ] )
    }
}

module.exports = Mysql