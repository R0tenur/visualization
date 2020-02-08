#include "stdafx.h"
#include <OdbcStatement.h>
#include <ReadColumnOperation.h>

namespace mssql
{
	bool ReadColumnOperation::TryInvokeOdbc()
	{
		if (_statement == nullptr) return false;
		return _statement->try_read_columns(this->_number_rows);
	}

	Local<Value> ReadColumnOperation::CreateCompletionArg()
	{
		return _statement->get_column_values();
	}
}
