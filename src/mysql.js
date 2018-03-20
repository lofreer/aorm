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
            database:   config.database
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
            charset: 'utf8',
            rowFormat: null
        }, options)

        const query = 'CREATE TABLE IF NOT EXISTS <%= data.table %> (<%= data.attributes %>) ENGINE=<%= data.engine %><%= data.charset %><%= data.collation %><%= data.initialAutoIncrement %><%= data.rowFormat %><%= data.comment %>'
        const attrStr = []
        let primaryKey = ''

        Utils.mapValues(attributes, (attr, key) => {
            let template = `\`${attr.name}\` ${attr.type}`
            if (!attr.allowNull && attr.defaultValue !== undefined) {
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
                primaryKey = ` PRIMARY KEY (\`${key}\`)`
            }
            attrStr.push(template)
        })
        attrStr.push(primaryKey)

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

    findById( tableName, id ) {
        let  _sql =  "SELECT * FROM ?? WHERE id = ? "
        return this.query( _sql, [ tableName, id ] )
    }

    findAll( tableName, {where, order} ) {
        let  _sql =  "SELECT * FROM ??"
        if (where) _sql += ` ${where}`
        if (order) _sql += ` ORDER BY ${order}`
        return this.query( _sql, [ tableName ] )
    }

    findOne( tableName, {where, order} ) {
        let  _sql =  "SELECT * FROM ??"
        if (where) _sql += ` ${where}`
        if (order) _sql += ` ORDER BY ${order}`
        _sql += ' LIMIT 1'
        return this.query( _sql, [ tableName ] )
    }

    create( tableName, values ) {
        let _sql = "INSERT INTO ?? SET ?"
        return this.query( _sql, [ tableName, values ] )
    }

    update( tableName, values, {where, id} ) {
        let _sql = "UPDATE ?? SET ?"
        if (id) {
            _sql +=  `WHERE id = ${id}`
        } else if (where) {
            _sql += ` ${where}`
        } else {
            throw new Error('Incorrect parameter')
        }
        
        return this.query( _sql, [ tableName, values ] )
    }

    destroy( tableName, id ) {
        let _sql = "DELETE FROM ?? WHERE id = ?"
        return this.query( _sql, [ tableName, id ] )
    }

    count( tableName ) {
        let  _sql =  "SELECT COUNT(*) FROM ?? "
        return this.query( _sql, [ tableName ] )
    }
}

module.exports = Mysql