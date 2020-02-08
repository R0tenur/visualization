//---------------------------------------------------------------------------------------------------------------------------------
// File: ResultSet.h
// Contents: ResultSet object that holds metadata and current column to return to Javascript
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

#include<vector>
#include "Column.h"

namespace mssql
{
    using namespace std;

    class ResultSet
    {

    public:
		typedef vector<shared_ptr<Column>> t_row;
        struct ColumnDefinition
        {
            wstring name;
            SQLULEN columnSize;
            SQLSMALLINT dataType;
            wstring dataTypeName;
            SQLSMALLINT decimalDigits;
            SQLSMALLINT nullable;
            wstring udtTypeName;
        };

        ResultSet(int num_columns) 
            : _row_count(0),
              _end_of_rows(true)
        {
            _metadata.resize(num_columns);
        }
  
        ColumnDefinition & get_meta_data(int column)
        {
            return _metadata[column];
        }

        size_t get_column_count() const
        {
            return _metadata.size();
        }
		void start_results()
        {
			_rows.clear();
        }
        Local<Value> meta_to_value();
		void add_column(size_t row_id, const shared_ptr<Column> & column);
		shared_ptr<Column> get_column(size_t row_id, size_t id) const;
		size_t get_result_count() const
		{
			return  _rows.size();
		}
       
        SQLLEN row_count() const
        {
            return _row_count;
        }

        bool EndOfRows() const
        {
            return _end_of_rows;
        }

    private:
		static Local<Object> get_entry(const nodeTypeFactory & fact, const ColumnDefinition & definition);
        vector<ColumnDefinition> _metadata;
		
        SQLLEN _row_count;
        bool _end_of_rows;
		vector<t_row> _rows;

		friend class OdbcStatement;
    };
}
