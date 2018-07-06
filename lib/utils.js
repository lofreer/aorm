
const utils = {}

utils.map = function(collection, iteratee){
    const func = Array.isArray(collection) ? arrayMap : mapValues
    return func(collection, getIteratee(iteratee, 3))
}

function arrayMap(array, iteratee) {
    let index = -1,
        length = array == null ? 0 : array.length,
        result = Array(length)

    while (++index < length) {
      result[index] = iteratee(array[index], index, array)
    }
    return result
}

function getIteratee() {
    let result = baseIteratee
    return arguments.length ? result(arguments[0], arguments[1]) : result
}

function baseIteratee(value) {
    console.log('v: ', value)
    if (typeof value == 'function') {
        return value
    }
}


utils.chunk = function(array, size = 1) {
    let count = Math.ceil(array.length / size)
    let _chunk = new Array(count)
    let index = -1
    let start = 0
    while (++index < count) {
        _chunk[index] = array.slice(start, start += size)
    }
    return _chunk
}

utils.mapKeys = function(object, iteratee) {
    if (object == null) {
        return {}
    }
    object = Object(object)
    if (!iteratee || typeof iteratee !== 'function') {
        iteratee = (value, key) => key
    }
    let res = {}
    for (let key in object) {
        if (object.hasOwnProperty(key)) {
            res[iteratee(object[key], key, object)] = object[key]
        }
    }
    return res
}

utils.mapValues = function(object, iteratee) {
    if (object == null) {
        return {}
    }
    object = Object(object)

    if (!iteratee || typeof iteratee !== 'function') {
        iteratee = (value, key) => value
    }

    let res = {}
    for (let key in object) {
        if (object.hasOwnProperty(key)) {
            res[key] = iteratee(object[key], key, object)
        }
    }
    return res
}

utils.values = function(object) {
    if (object == null) {
        return []
    }
    object = Object(object)
    let index = -1
    let res = []
    let keys = Object.keys(object)
    while (++index < keys.length) {
        res[index] = object[keys[index]]
    }
    return res
}

utils.defaults = function(object, ...sources) {
    if (object == null) {
        object = {}
    }
    sources.forEach(source => {
        for (let key in source) {
            if (object[key] === undefined) {
                object[key] = source[key]
            }
        }
    })
    return object
}

utils.pick = function(object, paths) {
    if (object == null || paths === undefined) {
        return {}
    }
    if (!Array.isArray(paths)) {
        paths = [String(paths)]
    }
    let result = {}
    for (let i = 0; i < paths.length; i++) {
        let key = paths[i]
        if (object[key] === undefined) {
            continue
        }
		result[key] = object[key]
    }
	
	return result
}

utils.omit = function(object, paths) {
    if (object == null) {
        return {}
    }
    if (paths === undefined) {
        return object
    }
    if (!Array.isArray(paths)) {
        paths = [String(paths)]
    }
    let result = {}
    for(let attr in object) {
        if (paths.indexOf(attr) < 0) {
            result[attr] = object[attr]
        }
    }
    return result
}

utils.copy = function copy(obj,deep) { 
    if (utils.isFunction(obj)) {
    	return new Function("return " + obj.toString())()
    } else if (obj === null || (typeof obj !== "object")) { 
        return obj;
    } else {
        var name, target = utils.isArray(obj) ? [] : {}, value

        for (name in obj) { 
            value = obj[name]

            if (value === obj) {
            	continue
            }

            if (deep) {
                if (utils.isArray(value) || utils.isObject(value)) {
                    target[name] = copy(value,deep)
                } else if (utils.isFunction(value)) {
                    target[name] = new Function("return " + value.toString())()
                } else {
            	    target[name] = value
                } 
            } else {
            	target[name] = value
            } 
        } 
        return target
    }　        
}

utils.template = function(text, data) {
    // 模板匹配正则
    var matcher = /<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g
    //模板文本中的特殊字符转义处理
    var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g
    var escapes = {
        "'": "'",
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\t': 't',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    }
    return ((text, data) => {
        //记录当前扫描位置;函数体数组初始化
        var index = 0, function_body = ["var temp = [];\n"]
        text.replace(matcher, function (match, interpolate, evaluate, offset) {
            //找到第一个匹配后，将前面部分作为普通字符串拼接的表达式，并添加处理转义字符
            function_body.push("temp.push('" + text.slice(index, offset).replace(escaper, function (match) { return '\\' + escapes[match]; }) + "');\n")
            // console.log(function_body)
            //如果是<% ... %>直接作为代码片段，evaluate就是捕获的分组
            if (evaluate) function_body.push(evaluate + '\n')
            //如果是<%= ... %>追加字符串，interpolate就是捕获的分组
            if (interpolate) function_body.push("temp.push(" + interpolate + ");\n")
            //递增index，跳过evaluate或者interpolate
            index = offset + match.length
            //返回匹配值，当前使用场景可忽略
            return match
        })
        //最后返回编译后的DOM代码    
        function_body.push("return temp.join('');")
        var render = new Function('data', function_body.join(''))
        return render(data)
    })(text, data)
}

const typeArray = 'Array Object String Date RegExp Function Boolean Number Null Undefined'.split(' ')
typeArray.forEach(function(v){
    utils['is' + v] = function(obj) {
        return {}.toString.call(obj) === "[object " + v + "]"
    }
})


module.exports = utils