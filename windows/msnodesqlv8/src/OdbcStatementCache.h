//---------------------------------------------------------------------------------------------------------------------------------
// File: OdbcStatementCache.h
// Contents: Async calls to ODBC done in background thread
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

#include "stdafx.h"
#include <map>
#include <OdbcConnection.h>

namespace mssql
{
	using namespace std;

	class OdbcStatement;

	class OdbcStatementCache
	{
	public:		
		OdbcStatementCache(const shared_ptr<OdbcConnectionHandle> &connection);
		~OdbcStatementCache();
		shared_ptr<OdbcStatement> checkout(long statement_id);
		void checkin(long statement_id);
		size_t size() const { return statements.size(); } 
		void clear();

	private:
		shared_ptr<OdbcStatement> find(long statement_id);
		shared_ptr<OdbcStatement> store(shared_ptr<OdbcStatement> statement);

		typedef map<long, shared_ptr<OdbcStatement>> map_statements_t;

		map_statements_t statements;
		shared_ptr<OdbcConnectionHandle> connection;
	};
}
