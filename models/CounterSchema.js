/**
 * @file /models/CounterSchema.js
 * @description Id 计数器——模型层
 */
const mongoose = require('mongoose')

const CounterSchema = mongoose.Schema({
  _id: String,
  sequence: Number
})

module.exports = mongoose.model('Counter', CounterSchema, 'counter')
