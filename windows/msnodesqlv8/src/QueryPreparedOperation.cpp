#include "stdafx.h"
#include <OdbcConnection.h>
#include <OdbcStatement.h>
#include <BoundDatumSet.h>
#include <QueryPreparedOperation.h>
#include <MutateJS.h>

namespace mssql
{
	QueryPreparedOperation::QueryPreparedOperation(
		const shared_ptr<OdbcConnection> &connection, 
		const size_t query_id, const u_int timeout, 
		const Local<Object> callback) :
		OdbcOperation(connection, callback),
		_timeout(timeout),
		_output_param_count(0)
	{
		_statementId = static_cast<long>(query_id);
		_params = make_shared<BoundDatumSet>();
	}

	bool QueryPreparedOperation::parameter_error_to_user_callback(const uint32_t param, const char* error) const
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

	bool QueryPreparedOperation::bind_parameters(Local<Array> &node_params) const
	{
		const auto res = _params->bind(node_params);
		if (!res)
		{
			parameter_error_to_user_callback(_params->first_error, _params->err);
		}

		return res;
	}

	bool QueryPreparedOperation::TryInvokeOdbc()
	{
		if (_statement == nullptr) return false;
		return _statement->bind_fetch(_params);
	}

	Local<Value> QueryPreparedOperation::CreateCompletionArg()
	{
		return _statement->get_meta_value();
	}
}
