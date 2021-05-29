/**
 * @description 通用工具函数
 */

/**
 * @description 封装 log4js 日志存储对象 logger
 */
const logger = require('./log')

const CODE = {
  SUCCESS: 200, // 成功
  PARAM_ERROR: 10001, // 参数错误
  ACCOUNT_ERROR: 20001, // 账号或密码错误
  LOGIN_ERROR: 30001, // 用户未登录
  BUSINESS_ERROR: 40001, // 业务请求失败
  AUTH_ERROR: 50001, // 认证失败或过期
}

module.exports = {
  /**
   * @description 分页起点信息计算
   * @param {Number} page 
   * @param {Number} limit 
   * @returns {Object} { start, page, limit }
   */
  pager (page = 1, limit = 10) {
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
   * @param {*} data 
   * @param {String} msg 
   * @param {Number} code 
   * @returns {Object} { code, msg }
   */
  success (data = {}, msg = '', code = CODE.SUCCESS) {
    const res = { code, data, msg }
    logger.debug(res)
    return res
  },
  /**
   * @description 处理业务失败时，包装返回数据，并且记录日志
   * @param {String} msg 
   * @param {Number} code 
   * @returns {Object} { code, msg }
   */
  fail (msg = '', code = CODE.BUSINESS_ERROR) {
    const res = { code, msg }
    logger.error(res)
    return res
  }
}

