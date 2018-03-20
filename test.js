const Orm = require('./lib')

const mysql = {
    database: 'know_test', // 使用哪个数据库
    username: 'root', // 用户名
    password: 'clover', // 口令
    host: 'localhost', // 主机名
    port: 3306, // 端口号，MySQL默认3306,
    dialect: 'mysql' // 数据库类型
}

/**
 * 连接指定类型的数据库
 * host：数据库地址
 * max：连接池最大连接数量
 * min：连接池最小连接数量
 * idle：每个线程最长等待时间
 * @type {Orm}
 */
const orm = new Orm(mysql.database, mysql.username, mysql.password, {
    host: mysql.host,
    debug: true,
    pool: {
        max: 20,
        min: 0,
        idle: 10000
    }
})

function defineModel(name, attributes, options = {}) {
    var attrs = {} 
    for (let key in attributes) {
        let value = attributes[key]
        if (typeof value === 'object' && value['type']) {
            value.allowNull = value.allowNull || false
            attrs[key] = value;
        } else {
            attrs[key] = {
                type: value,
                allowNull: false
            };
        }
    } 
    attrs.create_time = {
        type: 'bigint(13)',
        allowNull: false
    }
    attrs.update_time = {
        type: 'bigint(13)',
        allowNull: false
    }
    console.log('model defined for table: ' + name)
    return orm.define(name, attrs, Object.assign({
        tableName: name,
        hooks: {
            beforeValidate: (instance, options) => {
                let now = Date.now()
                if (instance.isNewRecord) {
                    if (!instance.create_time) instance.create_time = now
                    if (!instance.update_time) instance.update_time = now
                } else {
                    instance.update_time = now
                }
            }            
        }
    }, options));
}

defineModel('user_auth55', {
    id: {
        type: 'bigint(20)',
        autoIncrement: true,
        primaryKey: true,
        comment: '自增id'
    },
    uid: {
        type: 'bigint(20)',
        comment: '用户id',
        unique: '789'
    },
    type: {
        name: 'typetype',
        type: 'tinyint(1)',
        defaultValue: 1,
        comment: '1手机号 2邮箱 3用户名 4qq 5微信 6微博'
    },
    value: 'bigint(20)',
    identifier: {
        type: 'varchar(100)',
        allowNull: true,
        comment: '登录凭证(手机号 邮箱 用户名或第三方应用的唯一标识)'
    },
    certificate: {
        type: 'varchar(100)',
        allowNull: true,
        comment: '密码凭证(站内的保存密码，站外的不保存或保存token)'
    }
}, {
    comment: '用户授权 数据表'
})

orm.sync({force: true})