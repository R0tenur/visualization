#include "stdafx.h"
#include <OdbcConnection.h>
#include <OpenOperation.h>

namespace mssql
{
	OpenOperation::OpenOperation(const shared_ptr<OdbcConnection> &connection, const wstring& connection_string, const int timeout, const Local<Object> callback,
	                             const Local<Object> backpointer)
		: OdbcOperation(connection, callback),
		connectionString(connection_string),
		backpointer(Isolate::GetCurrent(), backpointer),
		timeout(timeout)
	{
	}

	OpenOperation::~OpenOperation()
	{
		backpointer.Reset();
	}

	bool OpenOperation::TryInvokeOdbc()
	{
		return _connection->try_open(connectionString, timeout);
	}

	Local<Value> OpenOperation::CreateCompletionArg()
	{
		const nodeTypeFactory fact;
		const auto o = fact.new_object(backpointer);
		return o;
	}
}
