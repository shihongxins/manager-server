const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
// 引入封装的 log4js
const logger = require('./utils/log')
// 引入数据库链接对象
require('./config/db')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  // 使用封装好的 log4js 打印调试请求信息
  logger.debug(`GET param: ${ctx.request.querystring}`)
  logger.debug(`POST data: ${JSON.stringify(ctx.request.body)}`)
  const start = new Date()
  await next()
  const ms = new Date() - start
})

// routes
// 引入路由对象
const router = require('koa-router')()
// 创建根路由
router.prefix('/api')
// 引入用户管理模块路由
const users = require('./routes/users')
// 根路由上挂载模块级路由
router.use(users.routes(), users.allowedMethods())
// 最终挂载使用根路由
app.use(router.routes(), router.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  // 使用封装好的 log4js 处理记录错误日志
  logger.error({err, ctx})
});

module.exports = app
