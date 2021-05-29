const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
// const logger = require('koa-logger')

const index = require('./routes/index')
const users = require('./routes/users')

// 引入自定义封装的 log4js 的 logger 对象
const logger = require('./utils/log')
// 尝试使用 logger 记录日志
// 1 普通 debugger 输出信息
logger.debug("这是自定义封装的 log4js 输出的 debugger 信息")
// 2 普通 info 输出到 console 控制台和 info.log 文件
logger.info("这是自定义封装的 log4js 输出的 info 信息")
// 2 测试 error 输出到 console 控制台和 info.log 文件，同时按天数保存错误日志文件
try {
  undefined.toString()
} catch (e) {
  logger.error(e.message)
}

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
// app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  // console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  // console.error('server error', err, ctx)
});

module.exports = app
