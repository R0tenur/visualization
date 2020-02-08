#include "stdafx.h"
#include <OdbcConnection.h>
#include <OdbcStatement.h>
#include <OdbcStatementCache.h>
#include <QueryOperation.h>
#include <QueryOperationParams.h>
#include <BoundDatumSet.h>
#include <MutateJS.h>

namespace mssql
{
	QueryOperation::QueryOperation(
		const shared_ptr<OdbcConnection> &connection, 
		const shared_ptr<QueryOperationParams> &query, 
		const Local<Object> callback) :
		OdbcOperation(connection, callback),
		_query(query),
		output_param_count(0)
	{
		_statementId = static_cast<long>(_query->id());
		_params = make_shared<BoundDatumSet>();
	}

	bool QueryOperation::parameter_error_to_user_callback(const uint32_t param, const char* error) const
	{
		const nodeTypeFactory fact;

		_params->clear();

		stringstream full_error;
		full_error << "IMNOD: [msnodesql] Parameter " << param + 1 << ": " << error;

		const auto err = fact.error(full_error);
		const auto imn = fact.new_string("IMNOD");
		MutateJS::set_property_value(err, fact.new_string("sqlstate"), imn);
		MutateJS::set_property_value(err, fact.new_string("code"), fact.new_integer(-1));

		Local<Value> args[1];
		args[0] = err;
		const auto argc = 1;

		fact.scoped_callback(_callback, argc, args);

		return false;
	}

	bool QueryOperation::bind_parameters(Local<Array> &node_params) const
	{
		const auto res = _params->bind(node_params);
		if (!res)
		{
			parameter_error_to_user_callback(_params->first_error, _params->err);
		}

		return res;
	}

	bool QueryOperation::TryInvokeOdbc()
	{
		_statement = _connection->statements->checkout(_statementId);	
		_statement->set_polling(_query->polling());
		return _statement->try_execute_direct(_query, _params);
	}

	Local<Value> QueryOperation::CreateCompletionArg()
	{
		return _statement->get_meta_value();
	}
}