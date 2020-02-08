#include "OdbcConnection.h"
#include <BeginTranOperation.h>

namespace mssql
{
	BeginTranOperation::BeginTranOperation(const shared_ptr<OdbcConnection> &connection, const Local<Object> callback)
		: OdbcOperation(connection, callback)
	{
	}

	bool BeginTranOperation::TryInvokeOdbc()
	{
		return _connection->try_begin_tran();
	}

	Local<Value> BeginTranOperation::CreateCompletionArg()
	{
		const nodeTypeFactory fact;
		return fact.null();
	}
}
