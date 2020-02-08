//---------------------------------------------------------------------------------------------------------------------------------
// File: Connection.cpp
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

#include <v8.h>
#include <Connection.h>
#include <OdbcConnection.h>
#include <MutateJS.h>

namespace mssql
{
	using namespace v8;

	Persistent<Function> Connection::constructor;

	Connection::Connection()
		: connectionBridge(make_unique<OdbcConnectionBridge>())
	{
	}

	void Connection::api(Local<FunctionTemplate> & tpl)
	{
		NODE_SET_PROTOTYPE_METHOD(tpl, "close", close);
		NODE_SET_PROTOTYPE_METHOD(tpl, "open", open);
		NODE_SET_PROTOTYPE_METHOD(tpl, "query", query);
		NODE_SET_PROTOTYPE_METHOD(tpl, "bindQuery", bind_query);
		NODE_SET_PROTOTYPE_METHOD(tpl, "prepare", prepare);
		NODE_SET_PROTOTYPE_METHOD(tpl, "readColumn", read_column);
		NODE_SET_PROTOTYPE_METHOD(tpl, "beginTransaction", begin_transaction);
		NODE_SET_PROTOTYPE_METHOD(tpl, "commit", commit);
		NODE_SET_PROTOTYPE_METHOD(tpl, "rollback", rollback);
		NODE_SET_PROTOTYPE_METHOD(tpl, "nextResult", read_next_result);
		NODE_SET_PROTOTYPE_METHOD(tpl, "callProcedure", call_procedure);
		NODE_SET_PROTOTYPE_METHOD(tpl, "unbind", unbind);
		NODE_SET_PROTOTYPE_METHOD(tpl, "freeStatement", free_statement);
		NODE_SET_PROTOTYPE_METHOD(tpl, "cancelQuery", cancel_statement);
		NODE_SET_PROTOTYPE_METHOD(tpl, "pollingMode", polling_mode);
	}

	void Connection::initialize(const Local<Object> exports)
	{
		const auto initialized = OdbcConnection::InitializeEnvironment();
		const nodeTypeFactory fact;
		const auto connection = fact.new_string("Connection");
		if (!initialized) {
			MutateJS::set_property_value(exports, connection, fact.undefined());
			fact.throwError("Unable to initialize msnodesql");
			return;
		}

		auto tpl = fact.new_template(New);

		tpl->InstanceTemplate()->SetInternalFieldCount(1);
		tpl->SetClassName(connection);

		api(tpl);
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe = tpl->GetFunction(context);
		Local<Function> local;
		if (maybe.ToLocal(&local)) {
			constructor.Reset(Isolate::GetCurrent(), local);
			MutateJS::set_property_value(exports, connection, local);
		}
	}

	Connection::~Connection()
	{
		// close the connection now since the object is being collected
		//connectionBridge->Collect();
	}

	void Connection::close(const FunctionCallbackInfo<Value>& info)
	{
		const auto cb = info[0].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->close(cb);
		info.GetReturnValue().Set(ret);
	}

	void Connection::begin_transaction(const FunctionCallbackInfo<Value>& info)
	{
		const auto cb = info[0].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->begin_transaction(cb);
		info.GetReturnValue().Set(ret);
	}

	void Connection::commit(const FunctionCallbackInfo<Value>& info)
	{
		const auto cb = info[0].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->commit(cb);
		info.GetReturnValue().Set(ret);
	}

	void Connection::rollback(const FunctionCallbackInfo<Value>& info)
	{
		const auto cb = info[0].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->rollback(cb);
		info.GetReturnValue().Set(ret);
	}

	void Connection::New(const FunctionCallbackInfo<Value>& info)
	{
		if (!info.IsConstructCall()) {
			return;
		}

		auto c = new Connection();
		c->Wrap(info.This());
		info.GetReturnValue().Set(info.This());
	}

	void Connection::query(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto query_object = info[1].As<Object>();
		const auto params = info[2].As<Array>();
		const auto callback = info[3].As<Object>();

		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->query(query_id, query_object, params, callback);
		info.GetReturnValue().Set(ret);
	}

	void Connection::prepare(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto query_object = info[1].As<Object>();
		const auto callback = info[2].As<Object>();

		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->prepare(query_id, query_object, callback);
		info.GetReturnValue().Set(ret);
	}

	void Connection::bind_query(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto params = info[1].As<Array>();
		const auto callback = info[2].As<Object>();

		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->query_prepared(query_id, params, callback);
		info.GetReturnValue().Set(ret);
	}

	void Connection::call_procedure(const FunctionCallbackInfo<Value>& info)
	{
		// need to ensure the signature is changed (in js ?) to form (?) = call sproc (?, ? ... );
		const auto query_id = info[0].As<Number>();
		const auto query_object = info[1].As<Object>();
		const auto params = info[2].As<Array>();
		const auto callback = info[3].As<Object>();

		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->call_procedure(query_id, query_object, params, callback);
		info.GetReturnValue().Set(ret);
	}

	void Connection::unbind(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto callback = info[1].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->unbind_parameters(query_id, callback);
		info.GetReturnValue().Set(ret);
	}

	void Connection::free_statement(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto callback = info[1].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->free_statement(query_id, callback);
		info.GetReturnValue().Set(ret);
	}

	void Connection::read_column(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto number_rows = info[1].As<Number>();
		const auto cb = info[2].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->read_column(query_id, number_rows, cb);
		info.GetReturnValue().Set(ret);
	}

	void Connection::read_next_result(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto callback = info[1].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->read_next_result(query_id, callback);
		info.GetReturnValue().Set(ret);
	}

	void Connection::open(const FunctionCallbackInfo<Value>& info)
	{
		const auto connection_object = info[0].As<Object>();
		const auto callback = info[1].As<Object>();

		const auto connection = Unwrap<Connection>(info.This());
		const auto ret = connection->connectionBridge->open(connection_object, callback, info.This());
		info.GetReturnValue().Set(ret);
	}

	void Connection::cancel_statement(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto callback = info[1].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());

		const auto ret = connection->connectionBridge->cancel(query_id, callback);
		info.GetReturnValue().Set(ret);
	}

	void Connection::polling_mode(const FunctionCallbackInfo<Value>& info)
	{
		const auto query_id = info[0].As<Number>();
		const auto v1 = info[1].As<Number>();
		const auto callback = info[2].As<Object>();
		const auto connection = Unwrap<Connection>(info.This());
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe = v1->Int32Value(context);
		const auto i32 = maybe.FromMaybe(0);
		const auto b1 = fact.new_boolean(i32 > 0);

		const auto ret = connection->connectionBridge->polling_mode(query_id, b1, callback);
		info.GetReturnValue().Set(ret);
	}
}

NODE_MODULE(sqlserver, mssql::Connection::initialize)

