/**
 * @file /models/UserSchema.js
 * @description 用户表——模型层
 */
const mongoose = require('mongoose')
// 表结构
const UserSchema = mongoose.Schema({
  "userId": Number, //用户ID，自增长
  "userName": String, //用户名称
  "userPwd": String, //用户密码，md5加密
  "userEmail": String, //用户邮箱
  "mobile": String, //手机号
  "sex": Number, //性别 1:男  0：女 
  "deptId": [], //部门
  "job": String, //岗位
  "state": {
    type: Number,
    default: 1
  }, //  1: 试用期 2: 在职 3: 离职 
  "role": {
    type: Number,
    default: 0
  }, // 用户角色 0： 普通用户 1：系统管理员 
  "roleList": [], //系统角色
  "createTime": {
    type: Date,
    default: Date.now()
  }, //创建时间
  "lastLoginTime": {
    type: Date,
    default: Date.now()
  }, //更新时间
  remark: String
})
// 导出表结构创建的模型(导出模型名,表结构,数据库表名称 collection)
module.exports = mongoose.model('User', UserSchema, 'user')
