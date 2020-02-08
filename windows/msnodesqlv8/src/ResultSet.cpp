//---------------------------------------------------------------------------------------------------------------------------------
// File: ResultSet.cpp
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

#include "stdafx.h"
#include <ResultSet.h>
#include <MutateJS.h>

namespace mssql
{
    using namespace v8;

    static const wchar_t* map_type(const SQLSMALLINT datatype)
    {
	   const wchar_t* type_name;

	   switch (datatype)
	   {
	   case SQL_CHAR:
	   case SQL_VARCHAR:
	   case SQL_LONGVARCHAR:
	   case SQL_WCHAR:
	   case SQL_WVARCHAR:
	   case SQL_WLONGVARCHAR:
	   case SQL_GUID:
	   case SQL_SS_XML:
		  type_name = L"text";
		  break;
	   case SQL_BIT:
		  type_name = L"boolean";
		  break;
	   case SQL_SMALLINT:
	   case SQL_TINYINT:
	   case SQL_INTEGER:
	   case SQL_DECIMAL:
	   case SQL_NUMERIC:
	   case SQL_REAL:
	   case SQL_FLOAT:
	   case SQL_DOUBLE:
	   case SQL_BIGINT:
		  type_name = L"number";
		  break;
	   case SQL_TYPE_TIME:
	   case SQL_SS_TIME2:
	   case SQL_TYPE_TIMESTAMP:
	   case SQL_TYPE_DATE:
	   case SQL_SS_TIMESTAMPOFFSET:
		  type_name = L"date";
		  break;
	   case SQL_BINARY:
	   case SQL_VARBINARY:
	   case SQL_LONGVARBINARY:
	   case SQL_SS_UDT:
		  type_name = L"binary";
		  break;
	   default:
		  type_name = L"text";
		  break;
	   }
	   return type_name;
    }

	shared_ptr<Column> ResultSet::get_column(const size_t row_id, const size_t column_id) const
	{
		if (row_id >= _rows.size())
		{
			return nullptr;
		}
		auto &row = _rows[row_id];
		return row[column_id];
	}

	void ResultSet::add_column(const size_t row_id, const shared_ptr<Column> &column)
	{
		if (_rows.size() < row_id + 1)
		{
			_rows.resize(row_id + 1);
		}
		auto &row = _rows[row_id];
		if (row.size() != _metadata.size())
		{
			row.resize(_metadata.size());
		}
		row[column->Id()] = column;
	}

	Local<Object> ResultSet::get_entry(const nodeTypeFactory & fact, const ColumnDefinition & definition)  {
		const auto type_name = map_type(definition.dataType);
		const auto entry = fact.new_object();
		MutateJS::set_property_value(entry, MutateJS::from_two_byte(L"size"), fact.new_integer(static_cast<int32_t>(definition.columnSize)));
		MutateJS::set_property_value(entry, MutateJS::from_two_byte(L"name"), MutateJS::from_two_byte(definition.name.c_str()));
		MutateJS::set_property_value(entry, MutateJS::from_two_byte(L"nullable"), fact.new_boolean(definition.nullable != 0));
		MutateJS::set_property_value(entry, MutateJS::from_two_byte(L"type"), MutateJS::from_two_byte(type_name));
		MutateJS::set_property_value(entry, MutateJS::from_two_byte(L"sqlType"), MutateJS::from_two_byte(definition.dataTypeName.c_str()));
		if (definition.dataType == SQL_SS_UDT) {
			MutateJS::set_property_value(entry, MutateJS::from_two_byte(L"udtType"), MutateJS::from_two_byte(definition.udtTypeName.c_str()));
		}
		return entry;
	}

	Local<Value> ResultSet::meta_to_value()
    {
	   const nodeTypeFactory fact;
	   auto metadata = fact.new_array();

	   for_each(this->_metadata.begin(), this->_metadata.end(), [fact, metadata](const ColumnDefinition & definition) {
		   MutateJS::set_array_elelemt_at_index(metadata, metadata->Length(), get_entry(fact, definition));
	   });

	   return metadata;
    }
}
