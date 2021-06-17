/**
 * @file /utils/common.js
 * @description 通用工具函数
 */

/**
 * @description 封装 log4js 日志存储对象 logger
 */
const logger = require('./log')
// 引入 JWT
const jwt = require('jsonwebtoken')

/**
 * @description 约定的响应状态码
 */
const CODE = {
  SUCCESS: 200, // 成功
  PARAM_ERROR: 10001, // 参数错误
  ACCOUNT_ERROR: 20001, // 账号或密码错误
  LOGIN_ERROR: 30001, // 用户未登录
  BUSINESS_ERROR: 40001, // 业务请求失败
  AUTH_ERROR: 50001, // 认证失败或过期
}

module.exports = {
  CODE,
  /**
   * @description 分页起点信息计算
   * @param {Number} page 
   * @param {Number} limit 
   * @returns {Object} { start, page, limit }
   */
  pager ({page = 1, limit = 10}) {
    page *= 1
    limit *= 1
    const start = (page - 1) * limit
    return {
      start,
      page,
      limit
    }
  },
  /**
   * @description 处理成功时，包装返回数据结构
   * @param {String} msg 
   * @param {*} data 
   * @param {Number} code 
   * @returns {Object} { code, msg , data }
   */
  success (msg = '', data = {}, code = CODE.SUCCESS) {
    const res = { code, msg , data }
    logger.debug(res)
    return res
  },
  /**
   * @description 处理业务失败时，包装返回数据，并且记录日志
   * @param {String} msg 
   * @param {*} data 
   * @param {Number} code 
   * @returns {Object} { code, msg , data }
   */
  fail (msg = '', data = {}, code = CODE.BUSINESS_ERROR) {
    const res = { code, msg , data }
    logger.error(res)
    return res
  },
  /**
   * @description 递归遍历数组生成树结构（菜单，部门）
   * @param {array} list 原始数组（带 _id 与 parentId）
   * @param {null|string|mongoose.Type.ObjectId} _id 当前节点的 _id
   * @param {null|array} tree 子节点数组
   * @returns {array} tree 树结构数组（菜单，部门）
   */
  deepTree(list, _id, tree) {
    tree = tree || []
    list.forEach((_item) => {
      const item = _item._doc
      // 因为是 mongoose.Type.ObjectId 类型，得转为字符串比较
      if (String(item.parentId.slice().pop()) == String(_id)) {
        // 递归遍历查找子节点
        item.children = this.deepTree(list, item._id, [])
        // 如果子节点为空，删除空子节点属性
        if (item.children.length === 0) {
          delete item.children
        }
        // 如果是菜单（部门不用），且它的子项是按钮，则拷贝一份子项用于权限区分
        if (item.menuType && item.children && item.children[0].menuType === 2) {
          item.actions = item.children
        }
        tree.push(item)
      }
    })
    // 如果没有传入 _id ，即第一次循环，却没有产生树的根节点，多半是搜索结果为多项无关联，直接返回原搜索数组
    if (!_id && tree.length == 0) {
      tree = list
    }
    return tree
  },
  /**
   * 
   * @param {string} authorization 
   * @returns jwt token data
   */
  decodeTokenData(authorization) {
    let data = {}
    if (authorization) {
      const auth = authorization.split(' ')
      if (auth.length === 2 && auth[0] === 'Bearer') {
        const token = jwt.decode(auth[1])
        if (token && token.data) {
          data = token.data
        }
      }
    }
    return data
  },
  /**
   * @description 日期格式化工具函数
   */
  formatterDateTime(datetime, formatter) {
    let timeScamp = 0;
    if (typeof datetime === 'number') {
      timeScamp = datetime;
    } else if (typeof datetime === 'string') {
      timeScamp = (new Date(datetime)).getTime();
      // ISO 时间转为 UTC 得加上时区偏移量（分钟 => 毫秒）
      // if (/T|Z/i.test(datetime)) {
      //   timeScamp += (new Date()).getTimezoneOffset() * 60 * 1000;
      // }
    } else if (Object.prototype.toString.call(datetime) === '[object Date]') {
      timeScamp = datetime.getTime();
    } else {
      console.error('Invalid datetime');
      return datetime;
    }
    const _datetime = new Date();
    _datetime.setTime(timeScamp);
    let _formatter = formatter || 'yyyy-MM-dd HH:mm:ss';
    const rules = {
      'y{4}': _datetime.getFullYear().toString(),
      'y{2}': _datetime.getFullYear().toString().slice(2),
      'M{2}': (`00${_datetime.getMonth() + 1}`).slice(-2),
      'M{1}': (_datetime.getMonth() + 1).toString(),
      'd{2}': (`00${_datetime.getDate()}`).slice(-2),
      'H{2}': (`00${_datetime.getHours()}`).slice(-2),
      'm{2}': (`00${_datetime.getMinutes()}`).slice(-2),
      'm{1}': _datetime.getMinutes().valueOf().toString(),
      's{2}': (`00${_datetime.getSeconds()}`).slice(-2),
      '\\.(s|S)+': `.${(`000${_datetime.getMilliseconds()}`).slice(-3)}`,
    };
    Object.keys(rules).forEach((r) => {
      const reg = new RegExp(`(${r})`);
      if (reg.test(_formatter)) {
        _formatter = _formatter.replace(reg, rules[r]);
      }
    });
    return _formatter;
  },
}

