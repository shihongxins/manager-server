/**
 * @file /utils/log.js
 * @author shihongxins
 * @description 封装 log4js 日志存储对象 logger
 */
const log4js  = require('log4js')
const levels = {
  trace: log4js.levels.TRACE,
  debug: log4js.levels.DEBUG,
  warn: log4js.levels.WARN,
  info: log4js.levels.INFO,
  error: log4js.levels.ERROR,
  fatal: log4js.levels.FATAL
}

// log4js 的自定义配置
log4js.configure({
  // 设置追加器，追加输出配置
  appenders: {
    // 定义名为 'console' 的输出配置，输出方式为 console
    console: { type: 'console' },
    // 定义名为 'info' 的输出配置
    info: {
      // 输出到错误日志文件 dateFile ，每天按日期整理一次，最多保存 7 天，过期自动删除
      type: 'dateFile',
      filename: 'logs/info.log',
      // 保持文件后缀
      keepFileExt: true,
      // 整理格式
      pattern: 'yyyy-MM-dd',
      // 始终保持 文件名+整理格式+后缀 的格式
      alwaysIncludePattern: true,
      // 保存天数
      daysToKeep: 7
    },
    // 定义名为 'error' 的输出配置
    error: {
      // 输出到错误日志文件 file 
      type: 'file',
      filename: 'logs/error.log',
      // 每份错误最多保存 5 M，超过就打包压缩备份，新建一个进行记录
      maxLogSize: 1000,
      compress: true,
      keepFileExt: true,
      // 最多保存 10 个备份文件
      backups: 10
    }
  },
  categories: {
    // 默认的输出类别：默认使用 console 输出配置，监听级别为 debug 及以上
    default: { appenders: ['console'], level: levels.debug },
    // 指定使用 output 的输出类别：既使用 console 输出配置，又使用 info 输出配置，监听级别为 info 及以上
    output: { appenders: ['console', 'info'], level: levels.info },
    // 指定使用 outputError 的输出类别：既使用 console 输出配置，又使用 info 输出配置，又使用 error 输出配置，监听级别为 error 及以上
    outputError: { appenders: ['console', 'info', 'error'], level: levels.error }
  }
})

/**
 * @param {Object} data 
 * @description debug 级别的日志输出，输出到 console 控制台
 */
exports.debug = (data) => {
  // 按输出类别获取 logger 实例，此处 console 为默认，可省略
  const logger = log4js.getLogger()
  // 设置 logger 实例的触发级别为 debug
  logger.level = levels.debug
  // 触发此 logger 实例的日志输出
  logger.debug(data)
}

/**
 * @param {Object} data 
 * @description info 级别的日志输出，输出到 console 控制台和 info.log 文件
 */
exports.info = (data) => {
  // 按输出类别获取 logger 实例，此处使用 output 输出类别
  const logger = log4js.getLogger('output')
  // 设置 logger 实例的触发级别为 debug
  logger.level = levels.info
  // 触发此 logger 实例的日志输出
  logger.info(data)
}

/**
 * @param {Object} data 
 * @description error 级别的日志输出，输出到 console 控制台和 info.log 文件，同时按天数保存错误日志文件
 */
exports.error = (data) => {
  // 按输出类别获取 logger 实例，此处使用 error 输出类别
  const logger = log4js.getLogger('outputError')
  // 设置 logger 实例的触发级别为 error
  logger.level = levels.error
  // 触发此 logger 实例的日志输出
  logger.error(data)
}
