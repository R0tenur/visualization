#include "stdafx.h"
#include <OdbcConnection.h>
#include <EndTranOperation.h>

namespace mssql
{
	EndTranOperation::EndTranOperation(const shared_ptr<OdbcConnection> &connection,
	                                   const SQLSMALLINT completion_type, const Local<Object> callback)
		: OdbcOperation(connection, callback),
		completionType(completion_type)
	{
	}

	bool EndTranOperation::TryInvokeOdbc()
	{
		return _connection->try_end_tran(completionType);
	}

	Local<Value> EndTranOperation::CreateCompletionArg()
	{
		const nodeTypeFactory fact;
		return fact.null();
	}
}
