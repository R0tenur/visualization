//---------------------------------------------------------------------------------------------------------------------------------
// File: OdbcStatementCache.cpp
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

#include <OdbcStatementCache.h>
#include <OdbcStatement.h>

namespace mssql
{
	using namespace std;

	OdbcStatementCache::OdbcStatementCache(const shared_ptr<OdbcConnectionHandle>  &connection) 
		: 
		connection(connection)
	{
	}

	OdbcStatementCache::~OdbcStatementCache()
	{
	}

	void OdbcStatementCache::clear()
	{
		vector<long> ids;
		// fprintf(stderr, "destruct OdbcStatementCache\n");

		for_each(statements.begin(), statements.end(), [&](const auto & p) {
			ids.insert(ids.begin(), p.first);
		});

		for_each(ids.begin(), ids.end(), [&](const long id) {
			// fprintf(stderr, "destruct OdbcStatementCache - erase statement %llu\n", id);
			statements.erase(id);
		});
	}

	shared_ptr<OdbcStatement> OdbcStatementCache::find(const long statement_id)
	{
		shared_ptr<OdbcStatement> statement = nullptr;
		const auto itr = statements.find(statement_id);
		if (itr != statements.end()) {
			statement = itr->second;
		}
		return statement;
	}

	shared_ptr<OdbcStatement> OdbcStatementCache::store(shared_ptr<OdbcStatement> statement)
	{
		statements.insert(pair<long, shared_ptr<OdbcStatement>>(statement->get_statement_id(), statement));
		return statement;
	}

	shared_ptr<OdbcStatement> OdbcStatementCache::checkout(long statement_id)
	{
		if (statement_id < 0)
		{
			//fprintf(stderr, "dont fetch id %ld\n", statementId);
			return nullptr;
		}
		auto statement = find(statement_id);
		if (statement) return statement;
		return store(make_shared<OdbcStatement>(statement_id, connection));
	}

	void OdbcStatementCache::checkin(const long statement_id)
	{
		statements.erase(statement_id);
	}
}
