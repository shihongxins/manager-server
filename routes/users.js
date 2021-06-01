/**
 * @file /routes/users.js
 * @description 用户管理模块——控制层
 */
// 引入模型层
const User = require('../models/UserSchema')
// 引入响应处理工具函数
const { CODE, success, fail } = require('../utils/common')
// 引入 项目自定义配置
const config = require('../config/index')
// 引入 JWT
const jwt = require('jsonwebtoken')
// 引入并注册路由
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
    /**
     * @description mongoose 查找数据库
     * 指定字段的方式
     * 1、 第三个参数 'userName userPwd'
     * 2、 第三个参数 {userName:1,_id:0}
     * 3、 select 回调 .select('userName userPwd')
     */
    const res = await User.findOne({ userName, userPwd }).select('userName userPwd')
    if (res) {
      const userInfo = res._doc;
      // 生成 token
      userInfo.token = jwt.sign({
        data: userInfo
      }, config.token_secret, {
        expiresIn: 60
      })
      // 成功:返回包装数据为响应
      ctx.body = success(userInfo)
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
