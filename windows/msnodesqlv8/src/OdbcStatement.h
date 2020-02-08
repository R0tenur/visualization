//---------------------------------------------------------------------------------------------------------------------------------
// File: OdbcConnection.h
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

#pragma once

#include <ResultSet.h>
#include <CriticalSection.h>

namespace mssql
{
	class BoundDatum;
	class BoundDatumSet;
	class DatumStorage;
	class QueryOperationParams;

	using namespace std;

	class OdbcStatement
	{
	public:

		enum OdbcStatementState
		{
			STATEMENT_CREATED,
			STATEMENT_PREPARED,
			STATEMENT_SUBMITTED,
			STATEMENT_FETCHING,
			STATEMENT_CANCELLED,
			STATEMENT_ERROR,
			STATEMENT_CLOSED
		};

		bool created() { return  _statementState == STATEMENT_CREATED; }
		bool cancel();
		
		OdbcStatement(long statement_id, shared_ptr<OdbcConnectionHandle> c);
		virtual ~OdbcStatement();
		SQLLEN get_row_count() const { return _resultset != nullptr ? _resultset->row_count() : -1; }
		shared_ptr<ResultSet> get_result_set() const
		{ return _resultset; } 

		long get_statement_id() const
		{ return _statementId; }

		bool is_prepared() const 
		{ return _prepared; }

		Local<Array> unbind_params() const;
		Local<Value> get_meta_value() const;
		bool  end_of_results() const;
		Local<Value> handle_end_of_results() const;
		Local<Value> end_of_rows() const;
		Local<Value> get_column_values() const;
		bool set_polling(bool mode);

		shared_ptr<vector<shared_ptr<OdbcError>>> errors(void) const
		{
			return _errors;
		}
	
		bool try_prepare(const shared_ptr<QueryOperationParams> &q);
		bool bind_fetch(const shared_ptr<BoundDatumSet> & param_set);
		bool try_execute_direct(const shared_ptr<QueryOperationParams> &q, const shared_ptr<BoundDatumSet> &paramSet);
		void cancel_handle();
		bool try_read_columns(size_t number_rows);
		bool try_read_next_result();

	private:
		bool fetch_read(const size_t number_rows);
		bool prepared_read();
		SQLRETURN poll_check(SQLRETURN ret, bool direct);
		bool get_data_binary(size_t row_id, size_t column);
		bool get_data_decimal(size_t row_id, size_t column);
		bool get_data_bit(size_t row_id, size_t column);
		bool get_data_timestamp(size_t row_id, size_t column);
		bool get_data_long(size_t row_id, size_t column);
		bool get_data_timestamp_offset(size_t row_id, size_t column);

		bool start_reading_results();
		SQLRETURN query_timeout(int timeout);
		bool d_variant(size_t row_id, size_t column);
		bool d_time(size_t row_id, size_t column);
		bool bounded_string(SQLLEN display_size, size_t row, size_t column);
		bool reserved_string(const size_t row_count, const size_t column_size, size_t const column) const;
		bool reserved_binary(const size_t row_count, const size_t column_size, size_t const column) const;
		bool reserved_bit(const size_t row_count, const size_t column) const;
		bool reserved_int(const size_t row_count, const size_t column) const;
		bool reserved_decimal(const size_t row_count, const size_t column) const;
		bool reserved_time(const size_t row_count, const size_t column) const;
		bool reserved_timestamp(const size_t row_count, const size_t column) const;
		bool reserved_timestamp_offset(const size_t row_count, const size_t column) const;
		void apply_precision(const shared_ptr<BoundDatum> & datum, int current_param) const;
		bool read_col_attributes(ResultSet::ColumnDefinition& current, int column);
		bool read_next(int column);
		bool check_more_read(SQLRETURN r, bool & status);
		bool lob(size_t, size_t column);
		static OdbcEnvironmentHandle environment;
		bool dispatch(SQLSMALLINT t, size_t row, size_t column);
		bool dispatch_prepared(const SQLSMALLINT t, const size_t column_size, const size_t rows_count, const size_t column) const;
		typedef vector<shared_ptr<BoundDatum>> param_bindings;
		typedef pair<int, shared_ptr<param_bindings>> tvp_t;
		bool bind_tvp(vector<tvp_t> &tvps);
		bool bind_datum(int current_param, const shared_ptr<BoundDatum> &datum);
		bool bind_params(const shared_ptr<BoundDatumSet> & params);
		void queue_tvp(int current_param, param_bindings::iterator &itr, shared_ptr<BoundDatum> &datum, vector <tvp_t> & tvps);
		bool try_read_string(bool binary, size_t row_id, size_t column);

		bool return_odbc_error();
		bool check_odbc_error(SQLRETURN ret);
		
		shared_ptr<QueryOperationParams> _query;
		shared_ptr<OdbcConnectionHandle> _connection;
		shared_ptr<OdbcStatementHandle> _statement;

		// any error that occurs when a Try* function returns false is stored here
		// and may be retrieved via the Error function below.

		shared_ptr<vector<shared_ptr<OdbcError>>> _errors;

		bool _endOfResults;
		long _statementId;
		bool _prepared;
		bool _cancelRequested;
		bool _pollingEnabled;

		OdbcStatementState _statementState = STATEMENT_CREATED;

		// set binary true if a binary Buffer should be returned instead of a JS string
	
		shared_ptr<ResultSet> _resultset;
		shared_ptr<BoundDatumSet> _boundParamsSet;
		shared_ptr<BoundDatumSet> _preparedStorage;	
		
		mutex g_i_mutex;

		const static size_t prepared_rows_to_bind = 50;
	};
}
