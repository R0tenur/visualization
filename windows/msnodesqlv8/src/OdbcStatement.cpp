//---------------------------------------------------------------------------------------------------------------------------------
// File: OdbcConnection.cpp
// Contents: Async calls to ODBC done in background thread
// 
// Copyright Microsoft Corporation and contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//
// You may obtain a copy of the License at:
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//---------------------------------------------------------------------------------------------------------------------------------

#include <algorithm>
#include <v8.h>
#include <OdbcStatement.h>
#include <BoundDatum.h>
#include <BoundDatumSet.h>
#include <NodeColumns.h>
#include <OdbcHelper.h>
#include <QueryOperationParams.h>
#include <MutateJS.h>

namespace mssql
{
	// internal constants

	size_t get_size(BoundDatumSet& params)
	{
		const auto f = params.begin();
		if (f == params.end()) return 0;
		auto p = *f;
		if (p->is_tvp)
		{
			//return p->param_size;
		}
		const auto size = p->get_ind_vec().size();
		return size;
	}

	OdbcStatement::~OdbcStatement()
	{
		_statementState = STATEMENT_CLOSED;
	}

	OdbcStatement::OdbcStatement(const long statement_id, const shared_ptr<OdbcConnectionHandle> c)
		:
		_connection(c),
		_endOfResults(true),
		_statementId(static_cast<long>(statement_id)),
		_prepared(false),
		_cancelRequested(false),
		_pollingEnabled(false),
		_resultset(nullptr),
		_boundParamsSet(nullptr)
	{
		// fprintf(stderr, "OdbcStatement::OdbcStatement OdbcStatement ID = %ld\n ", statement_id);
		_statement = make_shared<OdbcStatementHandle>();
		_errors = make_shared<vector<shared_ptr<OdbcError>>>();
		if (!_statement->alloc(*_connection))
		{
		}
	}
	
	bool OdbcStatement::try_read_columns(const size_t number_rows)
	{
		// fprintf(stderr, "try_read_columns %d\n", number_rows);
		bool res;
		_resultset->start_results();
		if (!_prepared) {
			res = fetch_read(number_rows);
		}
		else {
			res = prepared_read();
		}
		return res;
	}

	bool OdbcStatement::fetch_read(const size_t number_rows)
	{
		// fprintf(stderr, "fetch_read %d\n", number_rows);
		const auto& statement = *_statement;
		auto res = false;
		for (size_t row_id = 0; row_id < number_rows; ++row_id) {
			const auto ret = SQLFetch(statement);
			if (ret == SQL_NO_DATA)
			{
				_resultset->_end_of_rows = true;
				return true;
			}
			if (!check_odbc_error(ret)) return false;
			_resultset->_end_of_rows = false;
			res = true;

			const auto column_count = static_cast<int>(_resultset->get_column_count());
			for (auto c = 0; c < column_count; ++c) {
				const auto& definition = _resultset->get_meta_data(c);
				res = dispatch(definition.dataType, row_id, c);
				if (!res) {
					break;
				}
			}
		}
		return res;
	}

	bool OdbcStatement::prepared_read()
	{
		// fprintf(stderr, "prepared_read");
		const auto& statement = *_statement;
		SQLROWSETSIZE row_count;
		SQLSetStmtAttr(statement, SQL_ATTR_ROWS_FETCHED_PTR, &row_count, 0);
		const auto ret = SQLFetchScroll(statement, SQL_FETCH_NEXT, 0);
		if (ret == SQL_NO_DATA)
		{
			_resultset->_end_of_rows = true;
			return true;
		}
		_resultset->_end_of_rows = false;
		auto res = true;
		if (!check_odbc_error(ret)) return false;
		const auto column_count = static_cast<int>(_resultset->get_column_count());
		for (auto c = 0; c < column_count; ++c) {
			const auto& definition = _resultset->get_meta_data(c);
			// having bound a block, will collect 50 rows worth of data in 1 call.
			res = dispatch_prepared(definition.dataType, definition.columnSize, row_count, c);
			if (!res) {
				res = false;
				break;
			}
		}
		return res;
	}

	Local<Value> OdbcStatement::get_column_values() const
	{
		const nodeTypeFactory fact;
		const auto result = fact.new_object();
		if (_resultset->EndOfRows())
		{
			MutateJS::set_property_value(result, MutateJS::from_two_byte(L"end_rows"), fact.new_boolean(true));
		}

		const auto number_rows = _resultset->get_result_count();
		const auto column_count = static_cast<int>(_resultset->get_column_count());
		const auto results_array = fact.new_array(number_rows);
		MutateJS::set_property_value(result, MutateJS::from_two_byte(L"data"), results_array);
		for (size_t row_id = 0; row_id < number_rows; ++row_id) {
			auto row_array = fact.new_array(column_count);
			MutateJS::set_array_elelemt_at_index(results_array, row_id, row_array);
			for (auto c = 0; c < column_count; ++c)
			{
				MutateJS::set_array_elelemt_at_index(row_array, c, _resultset->get_column(row_id, c)->ToValue());
			}
		}

		return result;
	}

	void OdbcStatement::apply_precision(const shared_ptr<BoundDatum>& datum, const int current_param) const
	{
		/* Modify the fields in the implicit application parameter descriptor */
		SQLHDESC hdesc = nullptr;

		SQLGetStmtAttr(_statement->get(), SQL_ATTR_APP_PARAM_DESC, &hdesc, 0, nullptr);
		SQLSetDescField(hdesc, current_param, SQL_DESC_TYPE, reinterpret_cast<SQLPOINTER>(datum->c_type), 0);
		SQLSetDescField(hdesc, current_param, SQL_DESC_PRECISION, reinterpret_cast<SQLPOINTER>(datum->param_size), 0);
		SQLSetDescField(hdesc, current_param, SQL_DESC_SCALE, reinterpret_cast<SQLPOINTER>(datum->digits), 0);
		SQLSetDescField(hdesc, current_param, SQL_DESC_DATA_PTR, static_cast<SQLPOINTER>(datum->buffer), 0);
	}

	// this will show on a different thread to the current executing query.
	bool OdbcStatement::cancel()
	{
		lock_guard<mutex> lock(g_i_mutex);
		if (_pollingEnabled)
		{
			_cancelRequested = true;
			return true;
		}
		SQLINTEGER native_error = -1;
		auto c_state = "CANCEL";
		auto c_msg = "Error: [msnodesql] cancel only supported for statements where polling is enabled.";
		_errors->push_back(make_shared<OdbcError>(c_state, c_msg, native_error));
		return false;
	}

	bool OdbcStatement::set_polling(const bool mode)
	{
		lock_guard<mutex> lock(g_i_mutex);
		_pollingEnabled = mode;
		return true;
	}

	bool OdbcStatement::bind_tvp(vector<tvp_t>& tvps)
	{
		const auto& statement = *_statement;
		for (auto& tvp : tvps)
		{
			auto tvpret = SQLSetStmtAttr(statement, SQL_SOPT_SS_PARAM_FOCUS,
			                             reinterpret_cast<SQLPOINTER>(static_cast<long long>(tvp.first)), SQL_IS_INTEGER);
			if (!check_odbc_error(tvpret))
			{
				return false;
			}
			auto current_param = 1;
			const auto col_set = tvp.second;
			for (auto& col_itr : *col_set)
			{
				bind_datum(current_param, col_itr);
				current_param++;
			}
			tvpret = SQLSetStmtAttr(statement, SQL_SOPT_SS_PARAM_FOCUS,
			                        static_cast<SQLPOINTER>(nullptr), SQL_IS_INTEGER);
			if (!check_odbc_error(tvpret))
			{
				return false;
			}
		}
		return true;
	}

	bool OdbcStatement::bind_datum(const int current_param, const shared_ptr<BoundDatum> &datum)
	{
		const auto& statement = *_statement;
		auto r = SQLBindParameter(statement, current_param, datum->param_type, datum->c_type, datum->sql_type,
		                                datum->param_size, datum->digits, datum->buffer, datum->buffer_len,
		                                datum->get_ind_vec().data());
		if (!check_odbc_error(r)) {
			return false;
		}
		if (datum->get_defined_precision())
		{
			apply_precision(datum, current_param);
		}
		const auto name = datum->name;
		if (!name.empty()) {
			SQLINTEGER string_length;
			SQLHANDLE ipd = nullptr;
			const auto name_ptr = const_cast<wchar_t*>(name.c_str());
			r = SQLGetStmtAttr(statement, SQL_ATTR_IMP_PARAM_DESC, &ipd, SQL_IS_POINTER, &string_length);
			if (!check_odbc_error(r)) return false;
			SQLSetDescField(ipd, current_param, SQL_DESC_NAME, reinterpret_cast<SQLPOINTER>(name_ptr), name.size() * sizeof(wchar_t));
			if (!check_odbc_error(r)) return false;
		}
		
		return true;
	}

	void OdbcStatement::queue_tvp(int current_param, param_bindings::iterator& itr,  shared_ptr<BoundDatum> &datum, vector<tvp_t>& tvps) 
	{
		SQLHANDLE ipd;
		const auto& statement = *_statement;
		SQLINTEGER string_length;
		SQLTCHAR parameter_type_name[256];
		auto r = SQLGetStmtAttr(statement, SQL_ATTR_IMP_PARAM_DESC, &ipd, SQL_IS_POINTER, &string_length);
		if (!check_odbc_error(r)) return;
		const auto schema = datum->get_storage()->schema;		
		if (!schema.empty()) {
			const auto schema_ptr = const_cast<wchar_t*>(schema.c_str());
			r = SQLSetDescField(ipd, current_param, SQL_CA_SS_SCHEMA_NAME, reinterpret_cast<SQLPOINTER>(schema_ptr), schema.size() * sizeof(wchar_t));
			if (!check_odbc_error(r)) return;
			r = SQLGetDescField(ipd, current_param, SQL_CA_SS_SCHEMA_NAME, parameter_type_name, sizeof(parameter_type_name), &string_length);
			if (!check_odbc_error(r)) return;
		}
		tvp_t tvp;
		const auto cols = make_shared<BoundDatumSet::param_bindings>();
		for (auto c = 1; c <= datum->tvp_no_cols; ++c)
		{
			++itr;
			const auto& col_datum = *itr;
			cols->push_back(col_datum);
		}
		tvps.emplace_back(current_param, cols);
	}

	// bind all the parameters in the array
	bool OdbcStatement::bind_params(const shared_ptr<BoundDatumSet> &params)
	{
		auto& ps = *params;
		// fprintf(stderr, "bind_params\n");
		const auto size = get_size(ps);
		if (size <= 0) return true;
		const auto& statement = *_statement;
		if (size > 1)
		{
			const auto ret = SQLSetStmtAttr(statement, SQL_ATTR_PARAMSET_SIZE, reinterpret_cast<SQLPOINTER>(size), 0);
			if (!check_odbc_error(ret)) {
				return false;
			}
		}
		auto current_param = 1;

		vector<tvp_t> tvps;
		for (auto itr = ps.begin(); itr != ps.end(); ++itr)
		{
			auto& datum = *itr;
			if (!bind_datum(current_param, datum))
			{
				return false;
			}
			if (datum->is_tvp)
			{
				queue_tvp(current_param, itr, datum, tvps);
			}
			++current_param;
		}
		bind_tvp(tvps);

		return true;
	}

	Local<Array> OdbcStatement::unbind_params() const
	{
		if (_boundParamsSet != nullptr)
		{
			return _boundParamsSet->unbind();
		}
		const nodeTypeFactory fact;
		const auto arr = fact.new_array(0);
		return arr;
	}

	Local<Value> OdbcStatement::get_meta_value() const
	{
		return _resultset->meta_to_value();
	}

	bool OdbcStatement::end_of_results() const
	{
		return _endOfResults;
	}

	Local<Value> OdbcStatement::handle_end_of_results() const
	{
		const nodeTypeFactory fact;
		return fact.new_boolean(_endOfResults);
	}

	Local<Value> OdbcStatement::end_of_rows() const
	{
		const nodeTypeFactory fact;
		return fact.new_boolean(_resultset->EndOfRows());
	}

	bool OdbcStatement::return_odbc_error()
	{
		if (!_statement) return false;
		_statement->read_errors(_errors);
		return false;
	}

	bool OdbcStatement::check_odbc_error(const SQLRETURN ret)
	{
		if (!SQL_SUCCEEDED(ret))
		{
			_statementState = STATEMENT_ERROR;
			return return_odbc_error();
		}
		return true;
	}

	bool OdbcStatement::read_col_attributes(ResultSet::ColumnDefinition& current, const int column)
	{
		const size_t l = 1024;
		wchar_t type_name[l];
		SQLSMALLINT type_name_len;
		const auto index = column + 1;
		const auto width = sizeof(wchar_t);
		auto ret = SQLColAttribute(*_statement, index, SQL_DESC_TYPE_NAME, type_name, l * width, &type_name_len, nullptr);
		if (!check_odbc_error(ret)) return false;

		current.dataTypeName = wstring(type_name, type_name_len);

		switch (current.dataType)
		{
		case SQL_SS_VARIANT:
			{
				// dispatch as variant type which reads underlying column type and re-reads correctly.
			}
			break;

		case SQL_SS_UDT:
			{
				wchar_t udt_type_name[l];
				SQLSMALLINT udt_type_name_len;
				ret = SQLColAttribute(*_statement, index, SQL_CA_SS_UDT_TYPE_NAME, udt_type_name, l * width, &udt_type_name_len,
				                      nullptr);
				if (!check_odbc_error(ret)) return false;
				current.udtTypeName = wstring(udt_type_name, udt_type_name_len);
			}
			break;

		default:
			break;
		}

		return true;
	}

	bool OdbcStatement::read_next(const int column)
	{
		const auto& statement = *_statement;
		SQLSMALLINT name_length;
		const auto index = column + 1;
		auto ret = SQLDescribeCol(statement, index, nullptr, 0, &name_length, nullptr, nullptr, nullptr, nullptr);
		if (!check_odbc_error(ret)) return false;

		auto& current = _resultset->get_meta_data(column);
		const auto l = name_length + static_cast<SQLSMALLINT>(1);
		vector<wchar_t> buffer(l);
		ret = SQLDescribeCol(statement, index, buffer.data(), name_length + 1, &name_length, &current.dataType,
		                     &current.columnSize, &current.decimalDigits, &current.nullable);
		if (!check_odbc_error(ret)) return false;
		current.name = wstring(buffer.data(), name_length);

		ret = read_col_attributes(current, column);
		if (!check_odbc_error(ret)) return false;

		return ret;
	}

	bool OdbcStatement::start_reading_results()
	{
		SQLSMALLINT columns;
		const auto& statement = *_statement;
		auto ret = SQLNumResultCols(statement, &columns);
		if (!check_odbc_error(ret)) return false;

		auto column = 0;
		_resultset = make_unique<ResultSet>(columns);

		while (column < static_cast<int>(_resultset->get_column_count()))
		{
			if (!read_next(column++))
			{
				return false;
			}
		}

		ret = SQLRowCount(statement, &_resultset->_row_count);
		return check_odbc_error(ret);
	}

	SQLRETURN OdbcStatement::query_timeout(const int timeout)
	{
		const auto& statement = *_statement;
		if (timeout > 0)
		{
			const auto to = reinterpret_cast<SQLPOINTER>(static_cast<UINT_PTR>(timeout));
			const auto ret = SQLSetStmtAttr(statement, SQL_QUERY_TIMEOUT, to, SQL_IS_UINTEGER);
			if (!check_odbc_error(ret)) return false;
			SQLSetStmtAttr(statement, SQL_ATTR_QUERY_TIMEOUT, to, SQL_IS_UINTEGER);
			if (!check_odbc_error(ret)) return false;
		}
		return true;
	}

	bool OdbcStatement::try_prepare(const shared_ptr<QueryOperationParams> &q)
	{
		const auto& statement = *_statement;
		_query = q;
		const auto query = q->query_string();
		auto* sql_str = const_cast<SQLWCHAR *>(query.c_str());
		SQLSMALLINT num_cols;
		
	
		auto ret = SQLPrepare(statement, sql_str, static_cast<SQLINTEGER>(query.length()));
		if (!check_odbc_error(ret)) return false;

		ret = SQLNumResultCols(statement, &num_cols);
		if (!check_odbc_error(ret)) return false;

		_preparedStorage = make_shared<BoundDatumSet>();
		_resultset = make_unique<ResultSet>(num_cols);

		for (auto i = 0; i < num_cols; i++)
		{
			read_next(i);
		}

		SQLSetStmtAttr(statement, SQL_ATTR_ROW_ARRAY_SIZE, reinterpret_cast<SQLPOINTER>(prepared_rows_to_bind), 0);
		auto reserved=  _preparedStorage->reserve(_resultset, prepared_rows_to_bind);

		auto i = 0;
		for (auto& datum : *_preparedStorage)
		{
			ret = SQLBindCol(statement, i + 1, datum->c_type, datum->buffer, datum->buffer_len, datum->get_ind_vec().data());
			if (!check_odbc_error(ret)) return false;
			++i;
		}

		_resultset->_end_of_rows = true;
		_prepared = true;

		_statementState = STATEMENT_PREPARED;

		return true;
	}

	SQLRETURN OdbcStatement::poll_check(SQLRETURN ret, const bool direct)
	{
		const auto& statement = *_statement;

		if (ret == SQL_STILL_EXECUTING)
		{
			while (true)
			{
				if (direct)
				{
					ret = SQLExecDirect(statement, reinterpret_cast<SQLWCHAR*>(L""), SQL_NTS);
				}
				else
				{
					ret = SQLExecute(statement);
				}

				bool submit_cancel;
				if (ret != SQL_STILL_EXECUTING)
				{
					break;
				}

				Sleep(1); // wait 1 MS			
				{
					lock_guard<mutex> lock(g_i_mutex);
					submit_cancel = _cancelRequested;
				}

				if (submit_cancel)
				{
					cancel_handle();
				}
			}
		}
		return ret;
	}

	bool OdbcStatement::bind_fetch(const shared_ptr<BoundDatumSet> & param_set)
	{
		const auto& statement = *_statement;
		bool polling_mode;
		{
			lock_guard<mutex> lock(g_i_mutex);
			polling_mode = _pollingEnabled;
		}
		const auto bound = bind_params(param_set);
		if (!bound)
		{
			// error already set in BindParams
			return false;
		}
		if (polling_mode)
		{
			SQLSetStmtAttr(statement, SQL_ATTR_ASYNC_ENABLE, reinterpret_cast<SQLPOINTER>(SQL_ASYNC_ENABLE_ON), 0);
		}
	
		auto ret = SQLExecute(statement);
		if (polling_mode)
		{
			ret = poll_check(ret, false);
		}

		if (!check_odbc_error(ret)) return false;

		ret = SQLRowCount(statement, &_resultset->_row_count);
		return check_odbc_error(ret);
	}

	void OdbcStatement::cancel_handle()
	{
		const auto hnd = *_statement;
		const auto ret2 = SQLCancelHandle(hnd.HandleType, hnd.get());
		if (!check_odbc_error(ret2))
		{
			fprintf(stderr, "cancel req failed state %d %ld \n", _statementState, _statementId);
		}
		{
			lock_guard<mutex> lock(g_i_mutex);
			_cancelRequested = false;
		}
	}

	bool OdbcStatement::try_execute_direct(const shared_ptr<QueryOperationParams> &q, const shared_ptr<BoundDatumSet> &param_set)
	{
		// fprintf(stderr, "try_execute_direct\n");
		_errors->clear();
		_query = q;
		const auto timeout = q->timeout();
		const auto bound = bind_params(param_set);
		if (!bound)
		{
			// error already set in BindParams
			return false;
		}
		bool polling_mode;
		{
			lock_guard<mutex> lock(g_i_mutex);
			polling_mode = _pollingEnabled;
		}
		_endOfResults = true; // reset 
		auto ret = query_timeout(timeout);
		if (!check_odbc_error(ret)) return false;
		const auto query = q->query_string();
		auto* sql_str = const_cast<wchar_t *>(query.c_str());
		_statementState = STATEMENT_SUBMITTED;
		if (polling_mode)
		{
			SQLSetStmtAttr(*_statement, SQL_ATTR_ASYNC_ENABLE, reinterpret_cast<SQLPOINTER>(SQL_ASYNC_ENABLE_ON), 0);
		}
		// fprintf(stderr, "SQLExecDirect\n");
		ret = SQLExecDirect(*_statement, sql_str, SQL_NTS);

		if (polling_mode)
		{
			ret = poll_check(ret, true);
		}

		if (ret == SQL_NO_DATA)
		{
			start_reading_results();
			_resultset = make_unique<ResultSet>(0);
			_resultset->_end_of_rows = true;
			return true;
		}

		if (!SQL_SUCCEEDED(ret))
		{
			return_odbc_error();
			_resultset = make_unique<ResultSet>(0);
			_resultset->_end_of_rows = true;
			return false;
		}
		
		if (ret == SQL_SUCCESS_WITH_INFO)
		{
			return_odbc_error();
			_boundParamsSet = param_set;
			const auto res = start_reading_results();
			if (res)
			{
				_resultset->_end_of_rows = false;
			}
			else
			{
				_resultset = make_unique<ResultSet>(0);
				_resultset->_end_of_rows = true;
			}

			return false;
		}
		_boundParamsSet = param_set;
		return start_reading_results();
	}

	bool OdbcStatement::dispatch_prepared(const SQLSMALLINT t, const size_t column_size, const size_t rows_read, const size_t column) const
	{
		auto res = false;
		switch (t)
		{
		case SQL_SS_VARIANT:
			// res = d_variant(row_id, column);
			break;

		case SQL_CHAR:
		case SQL_VARCHAR:
		case SQL_LONGVARCHAR:
		case SQL_WCHAR:
		case SQL_WVARCHAR:
		case SQL_WLONGVARCHAR:
		case SQL_SS_XML:
		case SQL_GUID:
			res = reserved_string(rows_read, column_size, column);
			break;

		case SQL_BIT:
			res = reserved_bit(rows_read, column);
			break;

		case SQL_SMALLINT:
		case SQL_TINYINT:
		case SQL_INTEGER:
		case SQL_C_SLONG:
		case SQL_C_SSHORT:
		case SQL_C_STINYINT:
		case SQL_C_ULONG:
		case SQL_C_USHORT:
		case SQL_C_UTINYINT:
			res = reserved_int(rows_read, column);
			break;

		case SQL_DECIMAL:
		case SQL_NUMERIC:
		case SQL_REAL:
		case SQL_FLOAT:
		case SQL_DOUBLE:
		case SQL_BIGINT:
			res = reserved_decimal(rows_read, column);
			break;

		case SQL_BINARY:
		case SQL_VARBINARY:
		case SQL_LONGVARBINARY:
		case SQL_SS_UDT:
			res = reserved_binary(rows_read, column_size, column);
			break;

		case SQL_SS_TIMESTAMPOFFSET:
			res = reserved_timestamp_offset(rows_read, column);
			break;

		case SQL_TYPE_TIME:
		case SQL_SS_TIME2:
			res = reserved_time(rows_read, column);
			break;

		case SQL_TIMESTAMP:
		case SQL_DATETIME:
		case SQL_TYPE_TIMESTAMP:
		case SQL_TYPE_DATE:
			res = reserved_timestamp(rows_read, column);
			break;

		default:
			res = reserved_string(rows_read, column_size, column);
			break;
		}

		return res;
	}

	bool OdbcStatement::dispatch(const SQLSMALLINT t, const size_t row_id, const size_t column)
	{
		bool res;
		switch (t)
		{
		case SQL_SS_VARIANT:
			res = d_variant(row_id, column);
			break;

		case SQL_CHAR:
		case SQL_VARCHAR:
		case SQL_LONGVARCHAR:
		case SQL_WCHAR:
		case SQL_WVARCHAR:
		case SQL_WLONGVARCHAR:
		case SQL_SS_XML:
		case SQL_GUID:
			res = try_read_string(false, row_id, column);
			break;

		case SQL_BIT:
			res = get_data_bit(row_id, column);
			break;

		case SQL_SMALLINT:
		case SQL_TINYINT:
		case SQL_INTEGER:
		case SQL_C_SLONG:
		case SQL_C_SSHORT:
		case SQL_C_STINYINT:
		case SQL_C_ULONG:
		case SQL_C_USHORT:
		case SQL_C_UTINYINT:
			res = get_data_long(row_id, column);
			break;

		case SQL_DECIMAL:
		case SQL_NUMERIC:
		case SQL_REAL:
		case SQL_FLOAT:
		case SQL_DOUBLE:
		case SQL_BIGINT:
			res = get_data_decimal(row_id, column);
			break;

		case SQL_BINARY:
		case SQL_VARBINARY:
		case SQL_LONGVARBINARY:
		case SQL_SS_UDT:
			res = get_data_binary(row_id, column);
			break;

		case SQL_SS_TIMESTAMPOFFSET:
			res = get_data_timestamp_offset(row_id, column);
			break;

		case SQL_TYPE_TIME:
		case SQL_SS_TIME2:
			res = d_time(row_id, column);
			break;

		case SQL_TIMESTAMP:
		case SQL_DATETIME:
		case SQL_TYPE_TIMESTAMP:
		case SQL_TYPE_DATE:
			res = get_data_timestamp(row_id, column);
			break;

		default:
			res = res = try_read_string(false, row_id, column);
			break;
		}

		return res;
	}

	bool OdbcStatement::d_variant(const size_t row_id, const size_t column)
	{
		const auto& statement = *_statement;
		SQLLEN variant_type;
		SQLLEN iv;
		char b;
		//Figure out the length
		auto ret = SQLGetData(statement, column + 1, SQL_C_BINARY, &b, 0, &iv);
		if (!check_odbc_error(ret)) return false;
		//Figure out the type
		ret = SQLColAttribute(statement, column + 1, SQL_CA_SS_VARIANT_TYPE, nullptr, NULL, nullptr, &variant_type);
		if (!check_odbc_error(ret)) return false;
		// set the definiton to actual data underlying data type.
		auto& definition = _resultset->get_meta_data(column);
		definition.dataType = static_cast<SQLSMALLINT>(variant_type);
		const auto res = dispatch(definition.dataType, row_id, column);
		return res;
	}

	bool OdbcStatement::d_time(const size_t row_id, const size_t column)
	{
		const auto& statement = *_statement;
		SQLLEN str_len_or_ind_ptr;
		SQL_SS_TIME2_STRUCT time;
		memset(&time, 0, sizeof(time));

		const auto ret = SQLGetData(statement, column + 1, SQL_C_DEFAULT, &time, sizeof(time), &str_len_or_ind_ptr);
		if (!check_odbc_error(ret)) return false;
		if (str_len_or_ind_ptr == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true;
		}

		SQL_SS_TIMESTAMPOFFSET_STRUCT datetime;
		// not necessary, but simple precaution
		memset(&datetime, 0, sizeof(datetime));
		datetime.year = SQL_SERVER_DEFAULT_YEAR;
		datetime.month = SQL_SERVER_DEFAULT_MONTH;
		datetime.day = SQL_SERVER_DEFAULT_DAY;
		datetime.hour = time.hour;
		datetime.minute = time.minute;
		datetime.second = time.second;
		datetime.fraction = time.fraction;

		_resultset->add_column(row_id, make_shared<TimestampColumn>(column, datetime));
		return true;
	}

	bool OdbcStatement::get_data_timestamp_offset(const size_t row_id, const size_t column)
	{
		const auto& statement = *_statement;
		const auto storage = make_shared<DatumStorage>();
		storage->ReserveTimestampOffset(1);
		SQLLEN str_len_or_ind_ptr;

		const auto ret = SQLGetData(statement, column + 1, SQL_C_DEFAULT, storage->timestampoffsetvec_ptr->data(),
		                            sizeof(SQL_SS_TIMESTAMPOFFSET_STRUCT), &str_len_or_ind_ptr);
		if (!check_odbc_error(ret)) return false;
		if (str_len_or_ind_ptr == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true; // break
		}
		_resultset->add_column(row_id, make_shared<TimestampColumn>(column, storage));
		return true;
	}

	bool OdbcStatement::get_data_timestamp(const size_t row_id, const size_t column)
	{
		const auto& statement = *_statement;
		SQLLEN str_len_or_ind_ptr;
		TIMESTAMP_STRUCT v;
		const auto ret = SQLGetData(statement, column + 1, SQL_C_TIMESTAMP, &v,
		                            sizeof(TIMESTAMP_STRUCT), &str_len_or_ind_ptr);
		if (!check_odbc_error(ret)) return false;
		if (str_len_or_ind_ptr == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true; // break
		}
		_resultset->add_column(row_id, make_shared<TimestampColumn>(column, v));
		return true;
	}

	bool OdbcStatement::get_data_long(const size_t row_id, const size_t column)
	{
		const auto& statement = *_statement;
		
		long v;
		SQLLEN str_len_or_ind_ptr;
		const auto ret = SQLGetData(statement, column + 1, SQL_C_SLONG, &v, sizeof(int64_t),
		                            &str_len_or_ind_ptr);
		if (!check_odbc_error(ret)) return false;
		if (str_len_or_ind_ptr == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true;
		}
		_resultset->add_column(row_id, make_shared<IntColumn>(column, v));
		return true;
	}

	bool OdbcStatement::get_data_bit(const size_t row_id, const size_t column)
	{
		const auto& statement = *_statement;
		char v;
		SQLLEN str_len_or_ind_ptr;
		const auto ret = SQLGetData(statement, column + 1, SQL_C_BIT,&v, sizeof(byte),
		                            &str_len_or_ind_ptr);
		if (!check_odbc_error(ret)) return false;
		if (str_len_or_ind_ptr == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true;
		}
		_resultset->add_column(row_id, make_shared<BoolColumn>(column, v));
		return true;
	}

	bool OdbcStatement::reserved_bit(const size_t row_count, const size_t column) const
	{
		const auto& bound_datum = _preparedStorage->atIndex(column);
		auto& ind = bound_datum->get_ind_vec();
		const auto storage = bound_datum->get_storage();
		for (size_t row_id = 0; row_id < row_count; ++row_id) {			
			const auto str_len_or_ind_ptr = ind[row_id];
			if (str_len_or_ind_ptr == SQL_NULL_DATA)
			{
				_resultset->add_column(row_id, make_shared<NullColumn>(column));
				continue;
			}
			auto v = (*storage->charvec_ptr)[row_id];
			_resultset->add_column(row_id, make_shared<BoolColumn>(column, v));
		}		
		return true;
	}

	bool OdbcStatement::reserved_int(const size_t row_count, const size_t column) const
	{
		const auto& bound_datum = _preparedStorage->atIndex(column);
		auto& ind = bound_datum->get_ind_vec();
		const auto storage = bound_datum->get_storage();
		for (size_t row_id = 0; row_id < row_count; ++row_id) {
			auto v = (*storage->int64vec_ptr)[row_id];
			const auto str_len_or_ind_ptr = ind[row_id];
			if (str_len_or_ind_ptr == SQL_NULL_DATA)
			{
				_resultset->add_column(row_id, make_shared<NullColumn>(column));
				continue;
			}
			_resultset->add_column(row_id, make_shared<IntColumn>(column, v));
		}
		return true;
	}
	
	bool OdbcStatement::reserved_decimal(const size_t row_count, const size_t column) const
	{
		const auto& bound_datum = _preparedStorage->atIndex(column);
		auto& ind = bound_datum->get_ind_vec();
		const auto storage = bound_datum->get_storage();
		for (size_t row_id = 0; row_id < row_count; ++row_id) {
			auto v = (*storage->doublevec_ptr)[row_id];
			const auto str_len_or_ind_ptr = ind[row_id];
			if (str_len_or_ind_ptr == SQL_NULL_DATA)
			{
				_resultset->add_column(row_id, make_shared<NullColumn>(column));
				continue;
			}
			_resultset->add_column(row_id, make_shared<NumberColumn>(column, v));
		}
		return true;
	}

	bool OdbcStatement::reserved_timestamp(const size_t row_count, const size_t column) const
	{
		const auto& bound_datum = _preparedStorage->atIndex(column);
		auto& ind = bound_datum->get_ind_vec();
		const auto storage = bound_datum->get_storage();
		for (size_t row_id = 0; row_id < row_count; ++row_id) {
			auto v = (*storage->timestampvec_ptr)[row_id];
			const auto str_len_or_ind_ptr = ind[row_id];
			if (str_len_or_ind_ptr == SQL_NULL_DATA)
			{
				_resultset->add_column(row_id, make_shared<NullColumn>(column));
				continue;
			}
			_resultset->add_column(row_id, make_shared<TimestampColumn>(column, v));
		}
		return true;
	}

	bool OdbcStatement::reserved_timestamp_offset(const size_t row_count, const size_t column) const
	{
		const auto& bound_datum = _preparedStorage->atIndex(column);
		auto& ind = bound_datum->get_ind_vec();
		const auto storage = bound_datum->get_storage();
		for (size_t row_id = 0; row_id < row_count; ++row_id) {
			auto v = (*storage->timestampoffsetvec_ptr)[row_id];
			const auto str_len_or_ind_ptr = ind[row_id];
			if (str_len_or_ind_ptr == SQL_NULL_DATA)
			{
				_resultset->add_column(row_id, make_shared<NullColumn>(column));
				continue;
			}
			_resultset->add_column(row_id, make_shared<TimestampColumn>(column, v));
		}
		return true;
	}

	bool OdbcStatement::reserved_time(const size_t row_count, const size_t column) const
	{
		const auto& bound_datum = _preparedStorage->atIndex(column);
		auto& ind = bound_datum->get_ind_vec();
		const auto storage = bound_datum->get_storage();
		for (size_t row_id = 0; row_id < row_count; ++row_id) {
			auto & time = (*storage->time2vec_ptr)[row_id];
			const auto str_len_or_ind_ptr = ind[row_id];
			if (str_len_or_ind_ptr == SQL_NULL_DATA)
			{
				_resultset->add_column(row_id, make_shared<NullColumn>(column));
				continue;
			}

			SQL_SS_TIMESTAMPOFFSET_STRUCT datetime;
			// not necessary, but simple precaution
			memset(&datetime, 0, sizeof(datetime));
			datetime.year = SQL_SERVER_DEFAULT_YEAR;
			datetime.month = SQL_SERVER_DEFAULT_MONTH;
			datetime.day = SQL_SERVER_DEFAULT_DAY;
			datetime.hour = time.hour;
			datetime.minute = time.minute;
			datetime.second = time.second;
			datetime.fraction = time.fraction;

			_resultset->add_column(row_id, make_shared<TimestampColumn>(column, datetime));
		}
		return true;
	}

	bool OdbcStatement::get_data_decimal(const size_t row_id, const size_t column)
	{
		const auto& statement = *_statement;
		SQLLEN str_len_or_ind_ptr;
		double v;
		const auto ret = SQLGetData(statement, column + 1, SQL_C_DOUBLE, &v, sizeof(double),
		                            &str_len_or_ind_ptr);
		if (!check_odbc_error(ret)) return false;
		if (str_len_or_ind_ptr == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true;
		}
		_resultset->add_column(row_id, make_shared<NumberColumn>(column, v));
		return true;
	}

	bool OdbcStatement::get_data_binary(const size_t row_id, const size_t column)
	{
		auto storage = make_shared<DatumStorage>();

		const auto& statement = *_statement;
		const SQLLEN atomic_read = 24 * 1024;
		auto bytes_to_read = atomic_read;
		storage->ReserveChars(bytes_to_read + 1);
		auto & char_data = storage->charvec_ptr;
		auto write_ptr = char_data->data();
		SQLLEN total_bytes_to_read;
		auto r = SQLGetData(statement, column + 1, SQL_C_BINARY, write_ptr, bytes_to_read, &total_bytes_to_read);
		if (!check_odbc_error(r)) return false;
		if (total_bytes_to_read == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true; // break
		}
		auto status = false;
		auto more = check_more_read(r, status);
		if (!status)
		{
			return false;
		}
		char_data->resize(total_bytes_to_read);
		
		if (total_bytes_to_read > bytes_to_read) {
			total_bytes_to_read -= bytes_to_read;
		}
		write_ptr = char_data->data();
		write_ptr += bytes_to_read;
		while (more)
		{
			bytes_to_read = min(static_cast<SQLLEN>(atomic_read), total_bytes_to_read);
			r = SQLGetData(statement, column + 1, SQL_C_BINARY, write_ptr, bytes_to_read, &total_bytes_to_read);
			if (!check_odbc_error(r)) return false;
			more = check_more_read(r, status);
			if (!status)
			{
				return false;
			}
			write_ptr += bytes_to_read;
		}

		_resultset->add_column(row_id, make_shared<BinaryColumn>(column, storage, char_data->size()));
		return true;
	}


	bool OdbcStatement::check_more_read(SQLRETURN r, bool & status)
	{
		const auto& statement = *_statement;
		SQLWCHAR sql_state[6];
		SQLINTEGER native_error;
		SQLSMALLINT text_length;
		auto res = false;
		if (r == SQL_SUCCESS_WITH_INFO)
		{
			r = SQLGetDiagRec(SQL_HANDLE_STMT, statement, 1, sql_state, &native_error, nullptr, 0, &text_length);
			if (!check_odbc_error(r)) {
				status = false;
				return false;
			}
			res = wcsncmp(sql_state, L"01004", 6) == 0;
		}
		status = true;
		return res;
	}

	struct lob_capture
	{
		lob_capture() :
			total_bytes_to_read(atomic_read_bytes)
		{
			storage.ReserveUint16(atomic_read_bytes / item_size + 1);
			uint16_data = storage.uint16vec_ptr;
			write_ptr = uint16_data->data();		
			maxvarchar = false;
		}

		void trim() const
		{
			if (maxvarchar)
			{
				auto last = uint16_data->size() - 1;
				if (maxvarchar)
				{
					while ((*uint16_data)[last] == 0)
					{
						--last;
					}
					if (last < uint16_data->size() - 1) {
						uint16_data->resize(last + 1);
					}
				}
			}
		}

		 void on_next_read()
		{
			++reads;
			if (total_bytes_to_read < 0)
			{
				const int previous = uint16_data->size();
				total_bytes_to_read = bytes_to_read * (reads + 1);
				const auto n_items = total_bytes_to_read / item_size;
				uint16_data->reserve(n_items + 1);
				uint16_data->resize(n_items);
				write_ptr = uint16_data->data() + previous;
				memset(write_ptr, 0, uint16_data->data() + uint16_data->size() - write_ptr);
			}
			else
			{
				write_ptr += bytes_to_read / item_size;
			}
		}

		void on_first_read(const int factor = 2)
		{
			maxvarchar = total_bytes_to_read < 0;
			if (maxvarchar)
			{
				total_bytes_to_read = bytes_to_read * factor;
			}
			n_items = total_bytes_to_read / item_size;
			uint16_data->reserve(n_items + 1);
			uint16_data->resize(n_items);

			if (total_bytes_to_read > bytes_to_read) {
				total_bytes_to_read -= bytes_to_read;
			}
			write_ptr = uint16_data->data();
			write_ptr += bytes_to_read / item_size;
		}

		int reads = 1;
		size_t n_items = 0;
		bool maxvarchar;
		const size_t item_size = sizeof(uint16_t);
		const SQLLEN atomic_read_bytes = 24 * 1024;
		SQLLEN bytes_to_read = atomic_read_bytes;
		DatumStorage storage;
		shared_ptr<vector<uint16_t>> uint16_data;
		unsigned short* write_ptr;
		SQLLEN total_bytes_to_read;
	} ;
	
	
	bool OdbcStatement::lob(const size_t row_id, size_t column)
	{
		const auto& statement = *_statement;
		lob_capture capture;
		auto r = SQLGetData(statement, column + 1, SQL_C_WCHAR, capture.write_ptr, capture.bytes_to_read + capture.item_size, &capture.total_bytes_to_read);
		if (capture.total_bytes_to_read == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true;
		}
		if (!check_odbc_error(r)) return false;
		auto status = false;
		auto more = check_more_read(r, status);
		if (!status)
		{
			return false;
		}
		capture.on_first_read();
		while (more)
		{
			capture.bytes_to_read = min(static_cast<SQLLEN>(capture.atomic_read_bytes), capture.total_bytes_to_read);
			r = SQLGetData(statement, column + 1, SQL_C_WCHAR, capture.write_ptr, capture.bytes_to_read + capture.item_size, &capture.total_bytes_to_read);
			capture.on_next_read();
			if (!check_odbc_error(r)) return false;
			more = check_more_read(r, status);
			if (!status)
			{
				return false;
			}
		}
		capture.trim();
		_resultset->add_column(row_id, make_shared<StringColumn>(column, capture.uint16_data, capture.uint16_data->size()));
		return true;
	}

	bool OdbcStatement::reserved_string(const size_t row_count, const size_t column_size, const size_t column) const
	{
		const auto& bound_datum = _preparedStorage->atIndex(column);
		auto& ind = bound_datum->get_ind_vec();
		const auto size = sizeof(uint16_t);
		const auto storage = bound_datum->get_storage();			
		for (size_t row_id = 0; row_id < row_count; ++row_id) {
			const auto str_len_or_ind_ptr = ind[row_id];
			if (str_len_or_ind_ptr == SQL_NULL_DATA)
			{
				_resultset->add_column(row_id, make_shared<NullColumn>(column));
				continue;
			}
			auto offset = (column_size + 1) * row_id;
			const auto value = make_shared<StringColumn>(column, storage->uint16vec_ptr, offset, ind[row_id] / size);
			_resultset->add_column(row_id, value);
		}
		return true;
	}

	bool OdbcStatement::reserved_binary(const size_t row_count, const size_t column_size, const size_t column) const
	{
		const auto& bound_datum = _preparedStorage->atIndex(column);
		auto& ind = bound_datum->get_ind_vec();
		const auto storage = bound_datum->get_storage();
		for (size_t row_id = 0; row_id < row_count; ++row_id) {
			const auto str_len_or_ind_ptr = ind[row_id];
			if (str_len_or_ind_ptr == SQL_NULL_DATA)
			{
				_resultset->add_column(row_id, make_shared<NullColumn>(column));
				continue;
			}
			auto offset = column_size * row_id;
			const auto value = make_shared<BinaryColumn>(column, storage, offset, ind[row_id]);
			_resultset->add_column(row_id, value);
		}
		return true;
	}

	bool OdbcStatement::bounded_string(SQLLEN display_size, const size_t row_id, size_t column)
	{
		const auto storage = make_shared<DatumStorage>();
		const auto size = sizeof(uint16_t);
		SQLLEN value_len = 0;

		display_size++;
		storage->ReserveUint16(display_size); // increment for null terminator

		const auto r = SQLGetData(*_statement, column + 1, SQL_C_WCHAR, storage->uint16vec_ptr->data(), display_size * size,
		                          &value_len);
		if (!check_odbc_error(r)) return false;
		//CHECK_ODBC_NO_DATA(r, statement);

		if (value_len == SQL_NULL_DATA)
		{
			_resultset->add_column(row_id, make_shared<NullColumn>(column));
			return true;
		}

		assert(value_len % 2 == 0); // should always be even
		value_len /= size;

		assert(value_len >= 0 && value_len <= display_size - 1);
		storage->uint16vec_ptr->resize(value_len);
		const auto value = make_shared<StringColumn>(column, storage, value_len);
		_resultset->add_column(row_id, value);

		return true;
	}

	bool OdbcStatement::try_read_string(bool binary, const size_t row_id, const size_t column)
	{
		SQLLEN display_size = 0;

		const auto r = SQLColAttribute(*_statement, column + 1, SQL_DESC_DISPLAY_SIZE, nullptr, 0, nullptr, &display_size);
		if (!check_odbc_error(r)) return false;

		// when a field type is LOB, we read a packet at time and pass that back.
		if (display_size == 0 || display_size == numeric_limits<int>::max() ||
			display_size == numeric_limits<int>::max() >> 1 ||
			static_cast<unsigned long>(display_size) == numeric_limits<unsigned long>::max() - 1)
		{
			return lob(row_id, column);
		}

		if (display_size >= 1 && display_size <= SQL_SERVER_MAX_STRING_SIZE)
		{
			return bounded_string(display_size, row_id, column);
		}

		return false;
	}

	bool OdbcStatement::try_read_next_result()
	{
		//fprintf(stderr, "TryReadNextResult\n");
		//fprintf(stderr, "TryReadNextResult ID = %llu\n ", getStatementId());
		const auto state = _statementState;
		if (state == STATEMENT_CANCELLED)
		{
			//fprintf(stderr, "TryReadNextResult - cancel mode.\n");
			_resultset->_end_of_rows = true;
			_endOfResults = true;
			_statementState = STATEMENT_ERROR;
			return false;
		}
		const auto & statement = *_statement;
		const auto ret = SQLMoreResults(statement);
		switch (ret)
		{
		case SQL_NO_DATA:
			{
				//fprintf(stderr, "SQL_NO_DATA\n");
				_endOfResults = true;
				if (_prepared)
				{
					SQLCloseCursor(statement);
				}
				return true;
			}

		case SQL_SUCCESS_WITH_INFO:
			{
				return_odbc_error();
				const auto res = start_reading_results();
				if (res)
				{
					_resultset->_end_of_rows = false;
				}
				else
				{
					_resultset->_end_of_rows = true;
				}
				return false;
			}
		default: ;
		}
		_endOfResults = false;
		return start_reading_results();
	}
}
