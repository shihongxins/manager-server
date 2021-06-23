/**
 * @file /routes/user.js
 * @description 用户管理模块——控制层
 */
// 引入模型层
const User = require('../models/UserSchema')
const Counter = require('../models/CounterSchema')
// 引入响应处理工具函数
const common = require('../utils/common')
// 引入 项目自定义配置
const config = require('../config/index')
// 引入 JWT
const jwt = require('jsonwebtoken')
// 引入并注册路由
const router = require('koa-router')()
// 模块级路由
router.prefix('/user')
// 引入 MD5
const md5 = require('md5')

// 监听处理具体子路由事件
/**
 * @description 用户管理模块-用户登录
 */
router.post('/login', async (ctx) => {
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
    // 因为数据库中用户密码使用 md5 加密，登录检验时也要加密
    const res = await User.findOne(
      { $or: [{ userName }, { userEmail: userName }], $or: [{ userPwd }, { userPwd: md5(userPwd) }] }
    ).select('userId userName role state')
    if (res) {
      const userInfo = res._doc;
      // 生成 token
      userInfo.token = jwt.sign({
        data: userInfo
      }, config.token_secret, {
        expiresIn: '0.5h'
      })
      // 成功:返回包装数据为响应
      ctx.body = common.success("登录成功", userInfo)
    } else {
      // 失败:返回错误信息
      ctx.body = common.fail("账号或密码不正确！", res, common.CODE.ACCOUNT_ERROR)
    }
  } catch (e) {
    // 数据库出错
    ctx.body = common.fail("登录出错！", e)
  }
})

/**
 * @description 通过用户ID userId, 用户名 userName, 用户状态 state (1,2,3) 查询用户列表
 */
router.get('/list', async (ctx) => {
  // 接收参数
  const { userId, userName, state } = ctx.request.query
  // 获取分页数据
  let { pageNum, pageSize } = ctx.request.query
  const { start, page, limit } = common.pager({ page: pageNum, limit: pageSize })
  pageNum = page
  pageSize = limit
  // 参数过滤筛选
  const params = {}
  if (userId) {
    params.userId = userId
  }
  // ❗❗❗❗❗ mongoose 的模糊查询
  if (userName) {
    params.userName = { $regex: new RegExp(`${decodeURI(userName)}`, 'i') }
  }
  if (state && state != '0') {
    params.state = state
  }
  try {
    // 通过 mongoose 的数据模型层查询数据
    const list = await User.find(params, { userPwd: 0 }).skip(start).limit(limit)
    const total = await User.countDocuments(params)
    // 返回结果
    ctx.body = common.success("", { list, page: { pageNum, pageSize, total } })
  } catch (e) {
    ctx.body = common.fail("查询用户列表出错！", e)
  }
})

/**
 * @description 通过用户ID 组 userIds （批量）删除用户，不是硬删除，而是将状态改为离职[state=3]
 */
router.post('/delete', async (ctx) => {
  // 接收参数
  const { userIds } = ctx.request.body
  if (userIds.length) {
    try {
      // 只能删除普通用户 role = 0
      // 其他状态的“删除”是将状态改为离职
      let res = await User.updateMany({ userId: { $in: userIds }, role: 0 }, { state: 3 })
      if (res.ok > 0 && res.nModified) {
        ctx.body = common.success("成功删除 " + res.nModified + "条。", { nModified: res.nModified })
        return
      }
      // 已经是 离职 state = 3 的，再次执行“删除”是真的删除
      res = await User.deleteMany({ userId: { $in: userIds }, role: 0, state: 3 })
      if (res.ok > 0 && res.deletedCount > 0) {
        ctx.body = common.success("成功删除 " + res.deletedCount + "条。", { nModified: res.deletedCount })
        return
      }
      // 否则删除失败
      ctx.body = common.fail("删除用户失败！", res)
    } catch (e) {
      ctx.body = common.fail("删除用户出错!", e)
    }
  }
})

/**
 * @description 新增或编辑用户
 */
router.post('/operate', async (ctx) => {
  // 接收参数 userId,userName,userEmail,mobile,job,state,roleList,deptId,action,title
  const { userId, userName, userEmail, mobile, job, state, roleList, deptId, action } = ctx.request.body
  if (!(userName && userEmail && deptId)) {
    ctx.body = common.fail("缺少必要参数！", {}, common.CODE.PARAM_ERROR)
    return
  }
  let res, title = "新增/编辑用户"
  try {
    if (action === 'edit') {
      title = "编辑用户"
      res = await User.updateOne({ userId }, { mobile, job, state, roleList, deptId })
      if (res.ok) {
        ctx.body = common.success(title + "成功！", { nModified: 1 })
      } else {
        ctx.body = common.fail(title + "失败！", res)
      }
      return
    }
    if (action === 'add') {
      title = "新增用户"
      const check = await User.findOne({ $or: [{ userName }, { userEmail }] }, '_id userName userEmail')
      if (check && check._id) {
        ctx.body = common.fail(`用户信息重复：名称 ${check.userName} 邮箱 ${check.userEmail} 。`)
      } else {
        const counter = await Counter.findOneAndUpdate({ _id: "userId" }, { $inc: { sequence: 1 } }, { new: true })
        const user = new User({
          userId: counter.sequence,
          userName,
          userPwd: md5(`${userEmail.split('@')[0]}123456`),
          userEmail,
          mobile,
          job,
          state,
          roleList,
          deptId
        })
        newUser = await user.save()
        if (newUser && newUser._id) {
          ctx.body = common.success(`${title}成功！`, newUser)
        } else {
          ctx.body = common.fail(title + "失败！", newUser)
        }
      }
    }
  } catch (e) {
    ctx.body = common.fail(title + "出错!", e)
  }
})

module.exports = router
