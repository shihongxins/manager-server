const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
// 引入封装的 log4js
const logger = require('./utils/log')
// 引入 项目自定义配置
const config = require('./config/index')
// 引入通用工具函数与约定状态码
const common = require('./utils/common')
// 引入 koa-jwt 中间件验证 token
const koajwt = require('koa-jwt')
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
  await next().catch((err) => {
    // 捕获 koa-jwt 认证 token 失败抛出的异常
    if (err.status === 401) {
      ctx.status = 200
      ctx.body = common.fail("Token 过期或认证失败，请重新登录", "", common.CODE.AUTH_ERROR)
    } else {
      throw err;
    }
  })
})
// 使用 koa-jwt 中间件，在每次处理请求前验证 token ，注意排除登录与注册页，否则不能生成 token
app.use(koajwt({ secret: config.token_secret }).unless({
  path: [
    /^\/api\/user\/(login|register)/
  ]
}))

// routes
// 引入路由对象
const router = require('koa-router')()
// 创建根路由
router.prefix('/api')
// 引入用户管理模块路由
const user = require('./routes/user')
// 根路由上挂载用户管理模块路由
router.use(user.routes(), user.allowedMethods())
// 引入菜单管理模块路由
const menu = require('./routes/menu')
// 根路由上挂载菜单管理模块路由
router.use(menu.routes(), menu.allowedMethods())
// 引入角色管理模块路由
const role = require('./routes/role')
// 根路由上挂载角色管理模块路由
router.use(role.routes(), role.allowedMethods())
// 引入部门管理模块路由
const dept = require('./routes/dept')
// 根路由上挂载部门管理模块路由
router.use(dept.routes(), dept.allowedMethods())
// 引入休假申请模块路由
const leave = require('./routes/leave')
// 根路由上挂载休假申请模块路由
router.use(leave.routes(), leave.allowedMethods())
// 最终挂载使用根路由
app.use(router.routes(), router.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  // 使用封装好的 log4js 处理记录错误日志
  logger.error({err, ctx})
});

module.exports = app
