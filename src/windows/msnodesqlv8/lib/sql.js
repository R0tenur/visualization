'use strict'

// ---------------------------------------------------------------------------------------------------------------------------------
// File: sql.js
// Contents: javascript interface to Microsoft Driver for Node.js  for SQL Server
//
// Copyright Microsoft Corporation and contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//
// You may obtain a copy of the License at:
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ---------------------------------------------------------------------------------------------------------------------------------

const cw = require('./connection').connectionModule
const us = cw.userTypes

exports.module = module

exports.query = cw.query
exports.queryRaw = cw.queryRaw
exports.open = cw.open

exports.Bit = us.Bit

exports.BigInt = us.BigInt
exports.Int = us.Int
exports.TinyInt = us.TinyInt
exports.SmallInt = us.SmallInt

// add support for user assigned length.
exports.VarBinary = us.VarBinary
exports.LongVarBinary = us.LongVarBinary
exports.Image = us.LongVarBinary

exports.Float = us.Float
exports.Numeric = us.Numeric
exports.Money = us.Money
exports.SmallMoney = us.Money

exports.WVarChar = us.WVarChar
exports.Double = us.Double
exports.Decimal = us.Numeric

exports.Real = us.Real
exports.Char = us.Char // sent as Utf8
exports.VarChar = us.VarChar // sent as Utf8
exports.NChar = us.NChar // 16 bit
exports.NVarChar = us.NVarChar // 16 bit i.e. unicode
exports.Text = us.Text
exports.NText = us.Text
exports.Xml = us.Xml // recommended to use wide 16 bit rather than char
exports.UniqueIdentifier = us.UniqueIdentifier
exports.Time = us.Time
exports.Time2 = us.Time2
exports.Date = us.MyDate
exports.DateTime = us.DateTime
exports.DateTime2 = us.DateTime2
exports.DateRound = us.DateRound
exports.SmallDateTime = us.SmallDateTime
exports.DateTimeOffset = us.DateTimeOffset
exports.WLongVarChar = us.WLongVarChar
exports.PollingQuery = us.PollingQuery
exports.TimeoutQuery = us.TimeoutQuery
exports.TzOffsetQuery = us.TzOffsetQuery

exports.Table = us.Table
exports.TvpFromTable = us.TvpFromTable
