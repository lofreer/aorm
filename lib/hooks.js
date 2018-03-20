const Promise = require('./promise')
const Utils = require('./utils')

const hookTypes = {
    beforeValidate: {params: 2},
    afterValidate: {params: 2},
    validationFailed: {params: 3},
    beforeCreate: {params: 2},
    afterCreate: {params: 2},
    beforeDestroy: {params: 2},
    afterDestroy: {params: 2},
    beforeRestore: {params: 2},
    afterRestore: {params: 2},
    beforeUpdate: {params: 2},
    afterUpdate: {params: 2},
    beforeSave: {params: 2, proxies: ['beforeUpdate', 'beforeCreate']},
    afterSave: {params: 2, proxies: ['afterUpdate', 'afterCreate']},
    beforeUpsert: {params: 2},
    afterUpsert: {params: 2},
    beforeBulkCreate: {params: 2},
    afterBulkCreate: {params: 2},
    beforeBulkDestroy: {params: 1},
    afterBulkDestroy: {params: 1},
    beforeBulkRestore: {params: 1},
    afterBulkRestore: {params: 1},
    beforeBulkUpdate: {params: 1},
    afterBulkUpdate: {params: 1},
    beforeFind: {params: 1},
    beforeFindAfterExpandIncludeAll: {params: 1},
    beforeFindAfterOptions: {params: 1},
    afterFind: {params: 2},
    beforeCount: {params: 1},
    beforeDefine: {params: 2, sync: true},
    afterDefine: {params: 1, sync: true},
    beforeInit: {params: 2, sync: true},
    afterInit: {params: 1, sync: true},
    beforeConnect: {params: 1},
    afterConnect: {params: 2},
    beforeSync: {params: 1},
    afterSync: {params: 1},
    beforeBulkSync: {params: 1},
    afterBulkSync: {params: 1}
}
exports.hooks = hookTypes

function getHooks(hookType) {
    return (this.options.hooks || {})[hookType] || []
}

const Hooks = {

    _setupHooks(hooks) {
        this.options.hooks = {}
        Utils.mapValues(hooks || {}, (hooksArray, hookName) => {
            if (!Array.isArray(hooksArray)) hooksArray = [hooksArray]
            hooksArray.forEach(hookFn => this.addHook(hookName, hookFn))
        })
    },
   
    runHooks(hooks, ...hookArgs) {
        let hookType
        if (typeof hooks === 'string') {
            hookType = hooks
            hooks = getHooks.call(this, hookType)

            if (this.orm) {
                hooks = hooks.concat(getHooks.call(this.orm, hookType))
            }
        }

        if (!Array.isArray(hooks)) {
            hooks = [hooks]
        }

        if (hookTypes[hookType] && hookTypes[hookType].sync) {
            for (let hook of hooks) {
                if (typeof hook === 'object') {
                    hook = hook.fn
                }
                hook.apply(this, hookArgs)
            }
            return
        }

        return Promise.each(hooks, hook => {
            if (typeof hook === 'object') {
                hook = hook.fn
            }
            return Promise.resolve(hook.apply(this, hookArgs))
        }).return()
    },

    hook(...args) {
        return Hooks.addHook.apply(this, args)
    },

    addHook(hookType, name, fn) {
        if (typeof name === 'function') {
          fn = name
          name = null
        }
        this.options.hooks[hookType] = getHooks.call(this, hookType)
        this.options.hooks[hookType].push(name ? {name, fn} : fn)
    
        return this
    }
}

function applyTo(target) {
    Utils.mapValues(Hooks, (v, k) => {
        target[k] = v
    })
    for ( const hook in hookTypes) {
        target[hook] = function(name, callback) {
            return this.addHook(hook, name, callback)
        }
    }
}

exports.applyTo = applyTo 