#include "stdafx.h"
#include <OdbcStatement.h>
#include <ReadRowOperation.h>

namespace mssql
{
	bool ReadRowOperation::TryInvokeOdbc()
	{
		if (_statement == nullptr) return false;
		// fprintf(stderr, "invoke statement->TryReadRow() statementId = %d\n", statementId);
		const auto res = _statement->try_read_row();
		return res;
	}

	Local<Value> ReadRowOperation::CreateCompletionArg()
	{
		const auto res = _statement->end_of_rows();
		return res;
	}
}
