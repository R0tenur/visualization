#include "stdafx.h"
#include <OdbcConnection.h>
#include <CollectOperation.h>

namespace mssql
{
	CollectOperation::CollectOperation(const shared_ptr<OdbcConnection> &connection)
		: OdbcOperation(connection, Local<Object>())
	{
	}

	bool CollectOperation::TryInvokeOdbc()
	{
		return _connection->TryClose();
	}

	Local<Value> CollectOperation::CreateCompletionArg()
	{
		const nodeTypeFactory fact;
		return fact.null();
	}

	// override to not call a callback
	void CollectOperation::complete_foreground()
	{
	}
}
