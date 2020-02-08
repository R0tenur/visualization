//---------------------------------------------------------------------------------------------------------------------------------
// File: OdbcConnectionBridge.h
// Contents: Create (bridge) operations to be completed on background thread queue
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

#include <stdafx.h>

namespace mssql
{
	using namespace std;
	using namespace v8;

	class OdbcConnection;

	class OdbcConnectionBridge
	{
	public:

		OdbcConnectionBridge();
		~OdbcConnectionBridge();
		Local<Value> close(Local<Object> callback);
		void collect(void);
		Local<Value> begin_transaction(Local<Object> callback);
		Local<Value> commit(Local<Object> callback);
		Local<Value> rollback(Local<Object> callback);
		Local<Value> query(Local<Number> query_id, Local<Object> query_object, Local<Array> params, Local<Object> callback) const;
		Local<Value> query_prepared(Local<Number> query_id, Local<Array> params, Local<Object> callback) const;
		Local<Value> prepare(Local<Number> query_id, Local<Object> query_object, Local<Object> callback) const;
		Local<Value> call_procedure(Local<Number> query_id, Local<Object> query_object, Local<Array> params, Local<Object> callback) const;
		Local<Value> unbind_parameters(Local<Number> query_id, Local<Object> callback);
		Local<Value> cancel(Local<Number> query_id, Local<Object> callback);
		Local<Value> polling_mode(Local<Number> query_id, Local<Boolean> mode, Local<Object> callback);
		Local<Value> read_row(Local<Number> query_id, Local<Object> callback) const;
		Local<Value> read_next_result(Local<Number> query_id, Local<Object> callback) const;
		Local<Value> read_column(Local<Number> query_id, Local<Number> number_rows, Local<Object> callback) const;
		Local<Value> open(Local<Object> connection_object, Local<Object> callback, Local<Object> backpointer);
		Local<Value> free_statement(Local<Number> query_id, Local<Object> callback);

	private:
		shared_ptr<OdbcConnection> connection;
	};
}
