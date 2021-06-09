/**
 * @file /routes/Role.js
 * @description 角色管理模块——控制层
 */
// 引入模型层
const Role = require('../models/RoleSchema')
// 引入响应处理工具函数
const common = require('../utils/common')
// 引入并注册路由
const router = require('koa-router')()
// 模块级路由
router.prefix('/role')

/**
 * @description 通过角色名称 查询角色列表
 */
router.get('/list', async (ctx) => {
  // 接收参数
  const { roleName } = ctx.request.query
  // 获取分页数据
  let { pageNum, pageSize } = ctx.request.query
  const { start, page, limit } = common.pager({ page: pageNum, limit: pageSize })
  pageNum = page
  pageSize = limit
  // 参数过滤筛选
  const params = {}
  // ❗❗❗❗❗ mongoose 的模糊查询
  if (roleName) params.roleName = { $regex: new RegExp(`${roleName}`, 'i') }
  try {
    // 通过 mongoose 的数据模型层查询数据
    const list = await Role.find(params).skip(start).limit(limit)
    const total = await Role.countDocuments(params)
    // 返回结果
    ctx.body = common.success("", { list, page: { pageNum, pageSize, total } })
  } catch (e) {
    ctx.body = common.fail("查询角色列表出错！", e)
  }
})

/**
 * @description 新增、编辑、删除角色 和 权限设置
 */
router.post('/operate', async (ctx) => {
  // 获取操作类型与 _id 用于检验数据，剩下的信息用剩余参数存于 roleInfo 字段
  const { action, _id, roleName, rolePermission, remark } = ctx.request.body
  // 参数校验：如果未传入 action ['add', 'edit', 'delete'] 或者 未传入角色名称 或者 是编辑或者删除时 _id 未传入
  if ((!action) ||
    (!roleName) ||
    ((action === 'edit' || action === 'delete') && (!_id))) {
    ctx.body = common.fail("缺少必要参数！", {}, common.CODE.PARAM_ERROR)
    return
  }
  //
  let res, title = "新增/编辑/删除角色、权限设置"
  try {
    // 删除角色
    if (action === 'delete') {
      title = '删除角色'
      res = await Role.deleteOne({ _id })
    }
    // 编辑角色
    if (action === 'edit') {
      title = '编辑角色'
      // 根据 _id 字段更新 角色名 roleName 与 备注 remark
      res = await Role.updateOne({ _id }, { roleName, remark, updateTime: new Date() })
    }
    // 新增角色
    if (action === 'add') {
      title = '新增角色'
      // 检查是否以已经存在
      const check = await Role.findOne({ roleName }, '_id roleName')
      if (check && check._id) {
        ctx.body = common.fail(`重复新增角色：名称 ${check.roleName}。`)
      } else {
        res = await Role.create({ roleName, remark })
      }
    }
    // 设置权限
    if (action === 'setPermission' && rolePermission) {
      title = '设置权限'
      // 根据 _id 字段更新 角色权限 rolePermission
      res = await Role.updateOne({ _id }, { rolePermission, updateTime: new Date() })
    }
    // 判断操作结果
    if (res && (res.deletedCount > 0 || res.nModified > 0 || (res._id && action === 'add'))) {
      console.log(res);
      ctx.body = common.success(`${title} -> [${roleName}] 成功。`, { result: (res.nModified || res.deletedCount || 1) })
    } else {
      ctx.body = common.fail(`${title} -> [${roleName}] 失败！`, res)
    }
  } catch (e) {
    ctx.body = common.fail(title + "出错!", e)
  }
})

module.exports = router
