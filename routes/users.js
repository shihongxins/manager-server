/**
 * @file /routes/users.js
 * @description 用户管理模块——控制层
 */
// 引入模型层
const User = require('../models/UserSchema')
// 引入响应处理工具函数
const { CODE, success, fail } = require('../utils/common')
const router = require('koa-router')()
// 模块级路由
router.prefix('/users')

// 监听处理具体子路由事件
/**
 * @description 用户管理模块-用户登录
 */
router.post('/login',async (ctx) => {
  // 接收参数
  const { userName, userPwd } = ctx.request.body
  try {
    // 查找数据库验证
    const res = await User.findOne({ userName, userPwd })
    if (res) {
      // 成功:返回包装数据为响应
      ctx.body = success(res)
    } else {
      // 失败:返回错误信息
      ctx.body = fail("账号或密码不正确！", CODE.ACCOUNT_ERROR)
    }
  } catch (e) {
    // 数据库出错
    ctx.body = fail(e.message)
  }
})

module.exports = router
