/**
 * @file /models/MenuSchema.js
 * @description 菜单表——模型层
 */
const mongoose = require('mongoose')
// 表结构
const MenuSchema = mongoose.Schema({
  menuType: Number,
  menuState: Number,
  menuName: String,
  menuCode: String,
  icon: String,
  path: String,
  component: String,
  parentId: [mongoose.Types.ObjectId],
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
module.exports = mongoose.model('Menu', MenuSchema, 'menu')
