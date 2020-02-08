#include <v8.h>
#include <OdbcStatement.h>
#include <CancelOperation.h>
#include <OperationManager.h>

namespace mssql
{
	bool CancelOperation::TryInvokeOdbc()
	{
		if (_statement == nullptr) {
			return false;
		}
		return _statement->cancel();
	}

	Local<Value> CancelOperation::CreateCompletionArg()
	{
		const nodeTypeFactory fact;
		return fact.null();
	}
}
