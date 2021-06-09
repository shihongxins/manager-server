/**
 * @file /models/RoleSchema.js
 * @description 角色表——模型层
 */
const mongoose = require('mongoose')
// 表结构
const RoleSchema = mongoose.Schema({
  roleName: String,
  rolePermission: {
    type: Object,
    default: JSON.parse('{ "checkedPages": [], "checkedBtns": [] }')
  },
  "createTime": {
    type: Date,
    default: Date.now()
  }, //创建时间
  "updateTime": {
    type: Date,
    default: Date.now()
  }, //更新时间
  remark: String
})
// 导出表结构创建的模型(导出模型名,表结构,数据库表名称 collection)
module.exports = mongoose.model('Role', RoleSchema, 'role')
