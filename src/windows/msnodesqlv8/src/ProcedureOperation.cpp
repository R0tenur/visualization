#include "stdafx.h"
#include <OdbcConnection.h>
#include <OdbcStatement.h>
#include <OdbcStatementCache.h>
#include <ProcedureOperation.h>
#include <QueryOperationParams.h>

namespace mssql
{
	ProcedureOperation::ProcedureOperation(const shared_ptr<OdbcConnection> &connection,
	                                       const shared_ptr<QueryOperationParams> &query,
	                                       const Local<Object> callback) :
		QueryOperation(connection, query, callback)
	{
	}

	bool ProcedureOperation::TryInvokeOdbc()
	{
		_statement = _connection->statements->checkout(_statementId);
		_statement->set_polling(_query->polling());
		return _statement->try_execute_direct(_query, _params);
	}

	Local<Value> ProcedureOperation::CreateCompletionArg()
	{
		return _statement->get_meta_value();
	}
}