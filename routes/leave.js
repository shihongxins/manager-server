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
  let {
    applyState,
    type
  } = ctx.request.query
  applyState = parseInt(applyState)
  // 获取分页数据
  let { pageNum, pageSize } = ctx.request.query
  const { start, page, limit } = common.pager({ page: pageNum, limit: pageSize })
  pageNum = page
  pageSize = limit
  // 认证登录用户信息
  const { authorization } = ctx.request.headers
  const tokenData = common.decodeTokenData(authorization)
  if (tokenData && tokenData.userId && tokenData.role !== undefined) {
    try {
      // 参数过滤筛选
      const params = {}
      if (applyState > 0) {
        // 待审批和审批中，两阶段本质相同
        if (applyState === 1 || applyState === 2) {
          params.$or = [{ applyState: 1 }, { applyState: 2 }]
        } else {
          params.applyState = applyState
        }
      }
      if (type === 'audit') {
        // 审核列表（审核）
        if ([1, 2].includes(applyState)) {
          // 如果是查询待审核/审核中 的数据，需要求当前审核人等于登录用户
          params["currentFlowUser.userId"] = tokenData.userId
        } else {
          // 查询其他状态数据，就要求当前审批流程 **包含** 登录用户（❗❗❗❗❗注意 mongoose 包含关系的查询 auditFlows 是数组）
          params["auditFlows.userId"] = tokenData.userId
        }
      } else {
        // 申请列表（非审核）查询自己申请的
        params["applyUser.userId"] = tokenData.userId
      }
      // 通过 mongoose 的数据模型层查询数据
      let list = await Leave.find(params).skip(start).limit(limit)
      let total = await Leave.countDocuments(params)
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
 * @description 查询当前用户待我审批的数量作为通知数量
 */
router.get('/count', async (ctx) => {
  let total = 0;
  // 认证登录用户信息
  const { authorization } = ctx.request.headers
  const tokenData = common.decodeTokenData(authorization)
  if (tokenData && tokenData.userId) {
    const params = {
      $or: [{ applyState: 1 }, { applyState: 2 }],
      "currentFlowUser.userId": tokenData.userId
    }
    total = await Leave.countDocuments(params)
  } else {
    ctx.body = common.fail("查询已登录用户信息出错！", tokenData, common.CODE.AUTH_ERROR)
    return
  }
  ctx.body = common.success("", total)
});

/**
 * @description 新增申请，撤销作废申请
 */
router.post('/operate', async (ctx) => {
  // 获取操作类型与 _id 用于检验数据，剩下的信息用剩余参数存于 leaveInfo 字段
  const { action, _id, ...leaveInfo } = ctx.request.body
  // 参数校验：如果未传入 action ['add', 'delete'] 或者 编辑或者删除时 _id 未传入
  if ((!action) ||
    ((action === 'delete' || action === 'reject' || action === 'pass') && (!_id))
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
      // 新增休假申请
      if (action === 'add') {
        title = '新增休假申请'
        const userInfo = await User.findById(tokenData._id)
        if (userInfo && userInfo.deptId && userInfo.deptId.length) {
          const depts = await Dept.find({ _id: { $in: userInfo.deptId } })
          if (depts && depts.length) {
            // 审批流程
            const auditFlows = depts.map((item) => item.userInfo).reverse()
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
              currentFlowUser: auditFlows[0],
              auditLogs: [{
                ...tokenData,
                action,
                actionDesc: '新增',
                actionTime: new Date(),
                remark: title,
              }]
            })
            const newLeave = await leave.save()
            if (newLeave && newLeave._id) {
              ctx.body = common.success(`${title}成功！`, newLeave)
              return
            } else {
              ctx.body = common.fail(`${title}失败！`, newLeave)
            }
          } else {
            ctx.body = common.fail(`${title}失败，未找到当前用户的所属部门，无法创建审批流程。`, depts)
          }
        } else {
          ctx.body = common.fail(`${title}失败，当前登录用户所属部门为空，无法创建审批流程。`, userInfo)
        }
        return
      }
      const originInfo = await Leave.findById(_id)
      // 1 待审批 与 2 审批中 的可被批准/驳回
      if (originInfo && originInfo._id && originInfo.applyState < 3) {
        // 撤销并作废休假申请
        if (action === 'delete') {
          title = '撤销作废休假申请'
          let { applyState, auditLogs } = originInfo
          applyState = 5;
          auditLogs.push({
            ...tokenData,
            action,
            actionDesc: '撤销作废',
            actionTime: new Date(),
            remark: title,
          })
          res = await Leave.updateOne({ _id }, { applyState, auditLogs, updateTime: new Date() })
        }
        if (res && res.nModified) {
          ctx.body = common.success(`${title}成功！`, res)
          return
        }
      } else {
        ctx.body = common.fail(`撤销作废休假申请失败！非 待审批/审批中 的状态`, { res, originInfo })
      }
      // 其他情况：操作失败
      ctx.body = common.fail(`${title}失败！`, { res, originInfo })
    } catch (e) {
      ctx.body = common.fail(`${title}出错！`, e)
    }
  } else {
    ctx.body = common.fail("查询已登录用户信息出错！", tokenData, common.CODE.AUTH_ERROR)
  }
})

router.post('/audit', async (ctx) => {
  // 获取操作类型与 _id 用于检验数据，与备注 remark
  const { action, _id, remark } = ctx.request.body
  // 参数校验：如果未传入 action ['approve', 'reject'] 或者 编辑或者删除时 _id 未传入
  if (['approve', 'reject'].indexOf(action) === -1 || (!_id)) {
    ctx.body = common.fail("缺少必要参数！", {}, common.CODE.PARAM_ERROR)
    return
  }
  // 认证登录用户信息
  const { authorization } = ctx.request.headers
  const tokenData = common.decodeTokenData(authorization)
  if (tokenData && tokenData.userId) {
    let res, title = "批准/驳回 休假申请"
    try {
      const originInfo = await Leave.findById(_id)
      // 1 待审批 与 2 审批中 的可被批准/驳回
      if (originInfo && originInfo._id && originInfo.applyState < 3) {
        if (originInfo.currentFlowUser.userId === tokenData.userId) {
          let { applyState, auditFlows, currentFlow, currentFlowUser, auditLogs } = originInfo
          if (action === 'reject') {
            // 驳回
            title = '驳回休假申请'
            applyState = 4
          }
          if (action === 'approve') {
            title = '同意休假申请'
            if (currentFlow === (auditFlows.length - 1)) {
              // 流程结束，审批通过
              applyState = 3;
            } else {
              // 审核中
              applyState = 2;
              // 进入下一流程
              currentFlow++;
              currentFlowUser = auditFlows[currentFlow]
            }
          }
          auditLogs = auditLogs || [];
          auditLogs.push({
            ...tokenData,
            action,
            actionDesc: title,
            actionTime: new Date(),
            remark,
          })
          // 更新保存
          res = await Leave.updateOne({ _id }, { applyState, currentFlow, currentFlowUser, auditLogs })
          if (res && res.nModified) {
            ctx.body = common.success(`${title}成功！`, res)
            return
          }
        } else {
          ctx.body = common.fail(`${title}失败！流程非当前用户审批`, { res, originInfo, tokenData })
        }
      } else {
        ctx.body = common.fail(`${title}失败！非 待审批/审批中 的状态`, { res, originInfo })
      }
      // 其他情况：审批失败
      ctx.body = common.fail(`${title}失败！`, { res, originInfo })
    } catch (e) {
      ctx.body = common.fail(`${title}出错！`, e)
    }
  } else {
    ctx.body = common.fail("查询已登录用户信息出错！", tokenData, common.CODE.AUTH_ERROR)
  }
})

module.exports = router
