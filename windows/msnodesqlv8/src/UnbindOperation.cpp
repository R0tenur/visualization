#include "stdafx.h"
#include <OdbcStatement.h>
#include <UnbindOperation.h>

namespace mssql
{
	bool UnbindOperation::TryInvokeOdbc()
	{
		if (_statement == nullptr) return false;	
		return true;
	}

	Local<Value> UnbindOperation::CreateCompletionArg()
	{
		auto a = _statement->unbind_params();
		const auto ret = a->Clone();
		return ret;
	}
}
