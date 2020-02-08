//---------------------------------------------------------------------------------------------------------------------------------
// File: Connection.h
// Contents: C++ interface to Microsoft Driver for Node.js for SQL Server
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
//---------------------------------------------------------------------------------------------------------------------------------

#pragma once

#include "node_object_wrap.h"
#include "OdbcConnectionBridge.h"

namespace mssql
{
    using namespace std;
    using namespace v8;

    class Connection :node::ObjectWrap
    {
    public:
		static void initialize(Local<Object> exports);
		Connection();
		virtual ~Connection();

	private:
		
		static void New(const FunctionCallbackInfo<Value>& info);
		static void close(const FunctionCallbackInfo<Value>& info);
		static void begin_transaction(const FunctionCallbackInfo<Value>& info);
		static void commit(const FunctionCallbackInfo<Value>& info);
		static void rollback(const FunctionCallbackInfo<Value>& info);
		static void open(const FunctionCallbackInfo<Value>& info);
		static void query(const FunctionCallbackInfo<Value>& info);
		static void prepare(const FunctionCallbackInfo<Value>& info);
		static void bind_query(const FunctionCallbackInfo<Value>& info);
		static void call_procedure(const FunctionCallbackInfo<Value>& info);
		static void unbind(const FunctionCallbackInfo<Value>& info);
		static void free_statement(const FunctionCallbackInfo<Value>& info);
		static void read_row(const FunctionCallbackInfo<Value>& info);
		static void cancel_statement(const FunctionCallbackInfo<Value>& info);
		static void read_column(const FunctionCallbackInfo<Value>& info);
		static void read_next_result(const FunctionCallbackInfo<Value>& info);
		static void polling_mode(const FunctionCallbackInfo<Value>& info);
		
		static Persistent<Function> constructor;
		static void api(Local<FunctionTemplate>& tpl);
		unique_ptr<OdbcConnectionBridge> connectionBridge;
		Persistent<Object> This;
    };
}

