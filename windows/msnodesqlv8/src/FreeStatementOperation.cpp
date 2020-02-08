#include "stdafx.h"
#include <FreeStatementOperation.h>

namespace mssql
{
	bool FreeStatementOperation::TryInvokeOdbc()
	{
		// connection->statements->checkin(statementId);
		//fprintf(stderr, " checkin statementId %d size %llu\n", statementId, connection->statements->size());
		return true;
	}

	Local<Value> FreeStatementOperation::CreateCompletionArg()
	{
		const nodeTypeFactory fact;
		return fact.null();
	}
}
