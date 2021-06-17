/**
 * @file /routes/leave.js
 * @description 休假管理模块——控制层
 */
// 引入模型层
const Leave = require('../models/LeaveSchema')
// 引入模型层
const User = require('../models/UserSchema')
// 引入模型层
const Dept = require('../models/DeptSchema')
// 引入响应处理工具函数
const common = require('../utils/common')
// 引入并注册路由
const router = require('koa-router')()
// 模块级路由
router.prefix('/leave')


/**
 * @description 通过申请状态【0 全部, 1 待审批, 2 审批中, 3 审批通过, 4 审批驳回, 5 作废撤销】查询申请列表（本人的）
 */
router.get('/list', async (ctx) => {
  // 接收参数
  const {
    applyState
  } = ctx.request.query
  // 获取分页数据
  let { pageNum, pageSize } = ctx.request.query
  const { start, page, limit } = common.pager({ page: pageNum, limit: pageSize })
  pageNum = page
  pageSize = limit
  // 参数过滤筛选
  const params = {}
  if (applyState > 0) {
    params.applyState = applyState
  }
  // 认证登录用户信息
  const { authorization } = ctx.request.headers
  const tokenData = common.decodeTokenData(authorization)
  if (tokenData && tokenData.userId && tokenData.role !== undefined) {
    try {
      // 管理员查询所有数据
      if (tokenData.role !== 1) {
        // 非管理员查询自己申请的数据
        params.applyUser = { userId: tokenData.userId }
      }
      // 通过 mongoose 的数据模型层查询数据
      const list = await Leave.find(params).skip(start).limit(limit)
      const total = await Leave.countDocuments(params)
      // 返回结果
      ctx.body = common.success("", { list, page: { pageNum, pageSize, total } })
    } catch (e) {
      ctx.body = common.fail("查询休假申请列表出错！", e)
    }
  } else {
    ctx.body = common.fail("获取登录用户认证信息出错！", tokenData, common.CODE.AUTH_ERROR)
  }
})

/**
 * @description 新增申请，撤销作废申请
 */
router.post('/operate', async (ctx) => {
  // 获取操作类型与 _id 用于检验数据，剩下的信息用剩余参数存于 leaveInfo 字段
  const { action, _id, ...leaveInfo } = ctx.request.body
  // 参数校验：如果未传入 action ['add', 'delete'] 或者 编辑或者删除时 _id 未传入
  if ((!action) ||
    ((action === 'delete') && (!_id))
  ) {
    ctx.body = common.fail("缺少必要参数！", {}, common.CODE.PARAM_ERROR)
    return
  }
  // 认证登录用户信息
  const { authorization } = ctx.request.headers
  const tokenData = common.decodeTokenData(authorization)
  if (tokenData && tokenData.userId) {
    let res, title = "新增/撤销并作废 休假申请"
    try {
      // 撤销并作废休假申请
      if (action === 'delete') {
        title = '撤销作废休假申请'
        const origin = await Leave.findById(_id)
        if (origin && origin._id) {
          origin.applyState = 5;
          origin.updateTime = new Date();
          res = await Leave.updateOne({ _id }, origin)
          if (res && res.nModified) {
            ctx.body = common.success(`${title}成功！`, res)
            return
          }
        }
        // 其他情况：作废失败
        ctx.body = common.fail(`${title}失败！`, origin)
      }
      // 新增休假申请
      if (action === 'add') {
        title = '新增休假申请'
        const userInfo = await User.findById(tokenData._id)
        if (userInfo && userInfo.deptId && userInfo.deptId.length) {
          const depts = await Dept.find({ _id: { $in: userInfo.deptId } })
          if (depts && depts.length) {
            // 审批流程
            const auditFlows = depts.map((item) => item.userInfo)
            // 申请单号
            const today = common.formatterDateTime(new Date(), 'yyyy-MM-dd 00:00:00')
            let count = await Leave.countDocuments({ createTime: { $gte: new Date(today) } })
            count = (count || 0);
            const applyNO = `XJ-${common.formatterDateTime(today, 'yyyyMMdd')}${++count}`;
            const leave = Leave({
              ...leaveInfo, // leaveType,leaveDate,leaveLength,reason
              applyNO,
              applyUser: tokenData,
              auditFlows,
            })
            const newLeave = await leave.save()
            if (newLeave && newLeave._id) {
              ctx.body = common.success(`${title}成功！`, newLeave)
            } else {
              ctx.body = common.fail(`${title}失败！`, newLeave)
            }
          } else {
            ctx.body = common.fail(`${title}失败，未找到当前用户的所属部门，无法创建审批流程。`, depts)
          }
        } else {
          ctx.body = common.fail(`${title}失败，当前登录用户所属部门为空，无法创建审批流程。`, userInfo)
        }
      }
    } catch (e) {
      ctx.body = common.fail(`${title}出错！`, e)
    }
  } else {
    ctx.body = common.fail("查询已登录用户信息出错！", userInfo)
  }
})

module.exports = router
