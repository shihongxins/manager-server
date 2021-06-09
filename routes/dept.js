/**
 * @file /routes/dept.js
 * @description 部门管理模块——控制层
 */
// 引入模型层
const Dept = require('../models/DeptSchema')
// 引入响应处理工具函数
const common = require('../utils/common')
// 引入并注册路由
const router = require('koa-router')()
// 模块级路由
router.prefix('/dept')

/**
 * @description 通过部门名称查询部门列表（树形）
 */
router.get('/list', async (ctx) => {
  // 接收参数
  const { deptName } = ctx.request.query
  // 参数过滤筛选
  const params = {}
  // ❗❗❗❗❗ mongoose 的模糊查询
  if (deptName) params.deptName = {
    $regex: new RegExp(`${deptName}`, 'i')
  }
  try {
    // 通过 mongoose 的数据模型层查询数据
    const list = await Dept.find(params)
    const tree = common.menuTree(list)
    // 返回结果
    ctx.body = common.success("", tree)
  } catch (e) {
    ctx.body = common.fail("查询部门列表出错！", e)
  }
})

/**
 * @description 新增、编辑、删除部门
 */
router.post('/operate', async (ctx) => {
  // 获取操作类型与 _id 用于检验数据，剩下的信息用剩余参数存于 deptInfo 字段
  const {
    action,
    _id,
    ...deptInfo
  } = ctx.request.body
  // 参数校验：如果未传入 action ['add', 'edit', 'delete'] 或者 未传入部门名称 或者 是编辑或者删除时 _id 未传入
  if ((!action) ||
    (!deptInfo.deptName) ||
    ((action === 'edit' || action === 'delete') && (!_id))) {
    ctx.body = common.fail("缺少必要参数！", {}, common.CODE.PARAM_ERROR)
    return
  }
  //
  let res, title = "新增/编辑/删除部门"
  try {
    // 删除部门及其子部门
    if (action === 'delete') {
      title = '删除部门及其子部门'
      res = await Dept.deleteMany({
        $or: [{
          _id
        }, {
          parentId: {
            $all: [_id]
          }
        }]
      })
    }
    // 编辑部门
    if (action === 'edit') {
      title = '编辑部门'
      // 重设更新时间
      deptInfo.updateTime = new Date()
      // 根据 _id 字段更新 deptInfo (展开语法)
      res = await Dept.updateOne({
        _id
      }, {
        ...deptInfo
      })
    }
    // 新增部门
    if (action === 'add') {
      title = '新增部门'
      // 检查是否以已经存在
      const check = await Dept.findOne({
        deptName: deptInfo.deptName,
      }, '_id deptName')
      if (check && check._id) {
        ctx.body = common.fail(`重复新增部门：名称 ${check.deptName} 。`)
        return
      } else {
        res = await Dept.create({
          ...deptInfo
        })
      }
    }
    // 判断操作结果
    if (res && (res.deletedCount > 0 || res.nModified > 0 || (res._id && action === 'add'))) {
      ctx.body = common.success(`${title} -> [${deptInfo.deptName}] 成功。`, {
        result: (res.nModified || res.deletedCount || 1)
      })
    } else {
      ctx.body = common.fail(`${title} -> [${deptInfo.deptName}] 失败！`, res)
    }
  } catch (e) {
    ctx.body = common.fail(title + "出错!", e)
  }
})

module.exports = router