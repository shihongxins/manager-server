/**
 * @file /models/LeaveSchema.js
 * @description 休假表——模型层
 */
const mongoose = require('mongoose')
// 表结构
const LeaveSchema = mongoose.Schema({
  // 休假类型
  leaveType: {
    type: Number, // 1 事假, 2 调休, 3 年假
  },
  // 休假时间
  leaveDate: {
    type: Array,
    default: [],
  },
  // 休假时长
  leaveLength: {
    type: Number,
    default: 0,
  },
  // 休假原因
  reason: {
    type: String,
    default: '',
  },
  // 申请单号
  applyNO: {
    type: String,
  },
  // 申请人
  applyUser: {
    type: Object
  },
  // 申请状态
  applyState: {
    type: Number,
    default: 1, // 0 全部, 1 待审批, 2 审批中, 3 审批通过, 4 审批驳回, 5 作废撤销
  },
  // 审核流程
  auditFlows: {
    type: Array,
    default: [],
  },
  // 当前流程
  currentFlow: {
    type: Number,
    default: 0,
  },
  currentFlowUser: {
    type: Object,
  },
  // 审核日志
  auditLogs: {
    type: Array,
    default: [],
  },
  createTime: {
    type: Date,
    default: Date.now()
  }, //创建时间
  updateTime: {
    type: Date,
    default: Date.now()
  }, //更新时间
})
// 导出表结构创建的模型(导出模型名,表结构,数据库表名称 collection)
module.exports = mongoose.model('Leave', LeaveSchema, 'leave')
