/**
 * @file /utils/db.js 
 * @description 通过 mongoose 框架 链接数据库对象
 */

const {
  db_connection
} = require('./index')
const log4js = require('../utils/log')
const mongoose = require('mongoose')

mongoose.connect(db_connection, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// 通过链接实例，监听数据库链接结果
const db = mongoose.connection;
db.on('error', () => {
  log4js.error("链接数据库出错！")
})
db.once('open', function() {
  log4js.debug("链接数据库成功！")
})
