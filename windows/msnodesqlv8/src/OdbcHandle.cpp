//---------------------------------------------------------------------------------------------------------------------------------
// File: OdbcHandle.cpp
// Contents: Object to manage ODBC handles
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

#include <OdbcHandle.h>
#include "stdafx.h"
#include <locale>
#include <codecvt>
#include <set>

namespace mssql
{
	OdbcHandle::OdbcHandle(const SQLSMALLINT ht) 
		: 
		HandleType(ht), 
		handle(nullptr)
	{
		//fprintf(stderr, "OdbcHandle::OdbcHandle %i\n", HandleType);
	}

	OdbcHandle::~OdbcHandle()
	{
		free();
	}

	bool OdbcHandle::alloc()
	{
		assert(handle == SQL_NULL_HANDLE);
		const auto ret = SQLAllocHandle(HandleType, nullptr, &handle);
		if (!SQL_SUCCEEDED(ret))
		{
			handle = nullptr;
			return false;
		}
		return true;
	}
	
	bool OdbcHandle::alloc(const OdbcHandle &parent)
	{
		assert(handle == SQL_NULL_HANDLE);
		const auto ret = SQLAllocHandle(HandleType, parent, &handle);
		//fprintf(stderr, "Alloc OdbcHandle %i %p\n", HandleType, handle);
		if (!SQL_SUCCEEDED(ret))
		{
			handle = nullptr;
			return false;
		}
		return true;
	}

	void OdbcHandle::free()
	{
		if (handle != nullptr)
		{	
			//fprintf(stderr, "destruct OdbcHandle %i %p\n", HandleType, handle);
			SQLFreeHandle(HandleType, handle);
			handle = nullptr;
		}
	}

	SQLHANDLE OdbcHandle::get() const
	{
		return handle;
	} 

	void OdbcHandle::read_errors(shared_ptr<vector<shared_ptr<OdbcError>>> & errors) const
	{
		SQLSMALLINT msg_len;
		SQLRETURN      rc2;
		SQLINTEGER    native_error;
		SQLWCHAR        msg[2 * 1024];
		SQLWCHAR sql_state[6];
		set<string> received;
		// Get the status records.  
		SQLSMALLINT i = 1;
		while ((rc2 = SQLGetDiagRec(HandleType, handle, i, sql_state, &native_error, msg, sizeof(msg) / sizeof(SQLWCHAR), &msg_len)) != SQL_NO_DATA) {
			const wstring sqlstate(sql_state);
			const wstring message(msg);
			if (rc2 < 0) {
				break;
			}
			//setup converter
			using convert_type = codecvt_utf8<wchar_t>;
			wstring_convert<convert_type, wchar_t> converter;
			auto c_state = converter.to_bytes(sqlstate);
			auto c_msg = converter.to_bytes(message);
			const auto m = string(c_msg);
			if (received.find(m) == received.end()) {
				const auto last = make_shared<OdbcError>(c_state.c_str(), c_msg.c_str(), native_error);
				errors->push_back(last);
				received.insert(m);
			}
			i++;
		}
	}
}
