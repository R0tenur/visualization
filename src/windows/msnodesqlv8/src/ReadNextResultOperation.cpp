#include "stdafx.h"
#include <OdbcStatement.h>
#include <ReadNextResultOperation.h>
#include <MutateJS.h>

namespace mssql
{
	bool ReadNextResultOperation::TryInvokeOdbc()
	{
		if (_statement == nullptr) return false;
		preRowCount = _statement->get_row_count();
		const auto res = _statement->try_read_next_result();
		postRowCount = _statement->get_row_count();
		return res;
	}

	Local<Value> ReadNextResultOperation::CreateCompletionArg()
	{
		const nodeTypeFactory fact;
		const auto more_meta = fact.new_object();
		MutateJS::set_property_value(more_meta, fact.new_string("endOfResults"), _statement->handle_end_of_results());
		MutateJS::set_property_value(more_meta, fact.new_string("meta"), _statement->get_meta_value());
		MutateJS::set_property_value(more_meta, fact.new_string("preRowCount"), fact.new_int32(static_cast<int32_t>(preRowCount)));
		MutateJS::set_property_value(more_meta, fact.new_string("rowCount"), fact.new_int32(static_cast<int32_t>(postRowCount)));

		return more_meta;
	}
}
