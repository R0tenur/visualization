#include <v8.h>
#include <OdbcStatement.h>
#include <OperationManager.h>
#include <PollingModeOperation.h>

namespace mssql
{
	bool PollingModeOperation::TryInvokeOdbc()
	{
		if (_statement == nullptr) {
			return false;
		}
		return _statement->set_polling(_polling);
	}

	Local<Value> PollingModeOperation::CreateCompletionArg()
	{
		const nodeTypeFactory fact;
		return fact.null();
	}
}
