/**
 * @file /routes/menu.js
 * @description 菜单管理模块——控制层
 */
// 引入模型层
const Menu = require('../models/MenuSchema')
// 引入模型层
const User = require('../models/UserSchema')
// 引入模型层
const Role = require('../models/RoleSchema')
// 引入响应处理工具函数
const common = require('../utils/common')
// 引入并注册路由
const router = require('koa-router')()
// 模块级路由
router.prefix('/menu')

/**
 * @description 通过菜单名称， 菜单状态（0 停用、1 启用）查询菜单列表（树形）
 */
router.get('/list', async (ctx) => {
  // 接收参数
  const {
    menuName,
    menuState
  } = ctx.request.query
  // 参数过滤筛选
  const params = {}
  if (menuState !== undefined) {
    params.menuState = menuState
  }
  // ❗❗❗❗❗ mongoose 的模糊查询
  if (menuName) params.menuName = {
    $regex: new RegExp(`${decodeURI(menuName)}`, 'i')
  }
  try {
    // 通过 mongoose 的数据模型层查询数据
    const list = await Menu.find(params)
    // 有搜索条件，直接返回查询结果，没有搜索条件返回组成树结构
    const tree = (menuName && menuName.length) ? list : common.deepTree(list)
    // 返回结果
    ctx.body = common.success("", tree)
  } catch (e) {
    ctx.body = common.fail("查询菜单列表出错！", e)
  }
})

/**
 * @description 新增、编辑、删除菜单
 */
router.post('/operate', async (ctx) => {
  // 获取操作类型与 _id 用于检验数据，剩下的信息用剩余参数存于 menuInfo 字段
  const {
    action,
    _id,
    ...menuInfo
  } = ctx.request.body
  // 参数校验：如果未传入 action ['add', 'edit', 'delete'] 或者 未传入菜单名称 或者 是编辑或者删除时 _id 未传入
  if ((!action) ||
    (!menuInfo.menuName) ||
    ((action === 'edit' || action === 'delete') && (!_id))) {
    ctx.body = common.fail("缺少必要参数！", {}, common.CODE.PARAM_ERROR)
    return
  }
  //
  let res, title = "新增/编辑/删除菜单"
  try {
    // 删除菜单及其子菜单
    if (action === 'delete') {
      title = '删除菜单及其子菜单'
      res = await Menu.deleteMany({
        $or: [{
          _id
        }, {
          parentId: {
            $all: [_id]
          }
        }]
      })
    }
    // 编辑菜单
    if (action === 'edit') {
      title = '编辑菜单'
      // 重设更新时间
      menuInfo.updateTime = new Date()
      // 根据 _id 字段更新 menuInfo (展开语法)
      res = await Menu.updateOne({
        _id
      }, {
        ...menuInfo
      })
    }
    // 新增菜单
    if (action === 'add') {
      title = '新增菜单'
      // 检查是否以已经存在
      const check = await Menu.findOne({
        menuName: menuInfo.menuName,
        menuType: menuInfo.menuType,
        menuCode: menuInfo.menuCode
      }, '_id menuName menuType')
      if (check && check._id) {
        ctx.body = common.fail(`重复新增菜单：名称 ${check.menuName} 类型 ${check.menuType == 1 ? '页面菜单' : '普通按钮'} 。`)
        return
      } else {
        res = await Menu.create({
          ...menuInfo
        })
      }
    }
    // 判断操作结果
    if (res && (res.deletedCount > 0 || res.nModified > 0 || (res._id && action === 'add'))) {
      ctx.body = common.success(`${title} -> [${menuInfo.menuName}] 成功。`, res)
    } else {
      ctx.body = common.fail(`${title} -> [${menuInfo.menuName}] 失败！`, res)
    }
  } catch (e) {
    ctx.body = common.fail(title + "出错!", e)
  }
})

/**
 * @description 动态权限菜单：根据 token 获取已登录用户的角色信息，进而通过角色信息获取权限可访问的菜单及按钮列表
 */
router.get('/permissionList', async (ctx) => {
  const authorization = ctx.request.headers.authorization
  const tokenData = common.decodeTokenData(authorization)
  if (tokenData && tokenData._id) {
    try {
      const userInfo = await User.findById(tokenData._id)
      if (userInfo && userInfo.roleList) {
        let list = []
        // 权限动态菜单
        let menuList = []
        // 权限动态按钮
        let btnList = []
        if (userInfo.role === 1) {
          // 系统管理员拥有全部菜单权限
          list = await Menu.find({})
        } else {
          let permissionList = []
          // 普通用户通过自身的角色 id 查询角色信息
          const roleInfoList = await Role.find({ _id: { $in: userInfo.roleList } })
          // 遍历角色信息，组成权限列表
          roleInfoList.forEach((roleInfo) => {
            if (roleInfo.rolePermission) {
              if (roleInfo.rolePermission.checkedPages) {
                permissionList.push(...roleInfo.rolePermission.checkedPages)
              }
              if (roleInfo.rolePermission.checkedBtns) {
                permissionList.push(...roleInfo.rolePermission.checkedBtns)
              }
            }
          })
          // 多角色权限列表去重
          permissionList = [...new Set(permissionList)]
          // 然后通过权限列表查询菜单权限
          list = await Menu.find({ _id: { $in: permissionList } })
        }
        // 从全部菜单中区分 菜单列表 与 按钮列表
        list.forEach((item) => {
          if (item.menuType === 1) {
            menuList.push(item)
          } else if (item.menuType === 2) {
            btnList.push(item)
          }
        })
        // 将菜单列表转为菜单树
        menuList = common.deepTree(menuList)
        ctx.body = common.success("", { menuList, btnList })
      } else {
        ctx.body = common.fail("查询用户角色列表出错！", userInfo)
      }
    } catch (e) {
      ctx.body = common.fail("查询权限菜单出错！", e)
    }
  } else {
    ctx.body = common.fail("认证失败，获取权限菜单出错！")
  }
})

module.exports = router