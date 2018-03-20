
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

 /*
    用来存储有没有copy过的栈
*/  
function stackSet(key, value) {
    //o(n)
    let data = this.__data__
    let index = this.arryIndexOf(key)
    if ( index < 0 ) {
            //let data=[];//这个里面保存的是数组arry,数组的第一个是key,数组的第二个value
        data.push([key,value])
    }
    else{
        data[index][1]=value
    }
}
function arryIndexOf(key) {
    let data = this.__data__
    let length = data.length
    for (let i = 0; i < length; i++) {
        let entry = data[i]
        if (entry[0] == key)
            return i
    }
    return -1
}
function stackHas(key) {
    let data = this.__data__
    let length = data.length
    for (let i = 0; i < length; i++) {
        let entry = data[i]
        if (entry[0] == key)
        return i != -1
    }
    return false
}
function stackGet(key) {
    //o(n)
    let index = this.arryIndexOf(key)
    if ( index < 0 ) return
    return this.__data__ && this.__data__[index] && this.__data__[index][1]
}
function Stack() {
    let dataarry = []
    this.__data__ = dataarry //这个里面保存的是数组arry,数组的第一个是key,数组的第二个value
}
Stack.prototype.get = stackGet
Stack.prototype.set = stackSet
Stack.prototype.arryIndexOf = arryIndexOf


let toString = Object.prototype.toString
function isObject(object) {
    return object !=null && (typeof object == 'object')
}
function assignkeyvalue(object, key, value) {
    object[key] = value
}
function baseAssign(object, props) {
    let index = -1
    let length = props.length
    if (!object) {
        return
    }
    let dest = {}
    while (++index < length) {
        let key = props[index]
        assignkeyvalue(dest, key, object[key])
    }
    return dest
}
function getTag(object) {
    return toString.call(object)
}

/*
    拷贝对象
*/
function copyObject(object, stack) {
    if (!isObject(object)) {
        return
    }
    let tag = getTag(object)
    if(!!~['[object Number]', '[object Date]'].indexOf(tag)) {
        //Number Data  还有很多，这里是个示意
        let ctor = object.constructor
        return new ctor(+object)
    }
    let index = -1
    let keys = Object.keys(object)
    let length = keys.length
    let dest = {}
    //keys not include symbol
    while (++index < length) {
        let key = keys[index]
        if (isObject(object[key])) {
            stack = stack || new Stack
            //看对象有没有copy过
            let saved_value = stack.get(object)
            if (saved_value) {
                return saved_value
            }
            //设置为已拷贝
            stack.set(object, dest)
            //递归赋值
            assignkeyvalue(dest, key, copyObject(object[key], stack))
        }
        else{
            assignkeyvalue(dest, key, object[key])
        }
    }
    return dest
}
/*
    拷贝数组
*/
function copyArry(arry) {
    if (!Array.isArray(arry)) return []
    let dest = [],
        index = -1,
        length = arry.length
    while (++index < length) {
        if (isObject(arry[index])) {
            dest[index] = copyObject(arry[index])
        } else {
            dest[index] = arry[index]
        }
    }
    return dest
}
// 深拷贝
utils.cloneDeep = function(object) {
    if (!isObject(object)) return object
    return Array.isArray(object) ? copyArry(object) : copyObject(object)
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

const typeArray = ['String', 'Function', 'Array', 'Number', 'RegExp', 'Object', 'Date']
typeArray.forEach(function(v){
    utils['is' + v] = function(obj) {
        return {}.toString.call(obj) === "[object " + v + "]"
    }
})


module.exports = utils