//---------------------------------------------------------------------------------------------------------------------------------
// File: OdbcOperation.h
// Contents: ODBC Operation objects called on background thread
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

#include <Operation.h>

namespace mssql
{
	using namespace std;
	using namespace v8;

	class OdbcConnection;
	class OdbcStatement;

	class OdbcOperation : public Operation
	{
	public:

		OdbcOperation(size_t query_id, Local<Object> cb);
		OdbcOperation(const shared_ptr<OdbcConnection>& connection, size_t query_id, Local<Object>);
		OdbcOperation(const shared_ptr<OdbcConnection>& connection, Local<Object> cb);

		virtual ~OdbcOperation();
		virtual bool TryInvokeOdbc() = 0;
		virtual Local<Value> CreateCompletionArg() = 0;

		void getFailure();
		void invoke_background() override;
		void complete_foreground() override;

	protected:

		friend OdbcConnection;

		shared_ptr<OdbcConnection> _connection;
		shared_ptr<OdbcStatement> _statement;
		Persistent<Function> _callback;
		Local<Value> _output_param;
		Local<Object> _cb;
		void fetch_statement();
		long _statementId;

	private:

		bool failed;
		shared_ptr<vector<shared_ptr<OdbcError>>> failures;
		clock_capture timer;
		int error(Local<Value> args[]);
		int success(Local<Value> args[]);
	};
}

