//---------------------------------------------------------------------------------------------------------------------------------
// File: OdbcHandle.h
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

#pragma once

#include "stdafx.h"
#include <vector>

namespace mssql
{
    using namespace std;

    class OdbcHandle
    {
    public:
		SQLSMALLINT HandleType;
		OdbcHandle(SQLSMALLINT ht);
		~OdbcHandle();
		bool alloc();
		bool alloc(const OdbcHandle &parent);
		void free();
		SQLHANDLE get() const;
		operator SQLHANDLE() const { return handle; }
		operator bool() const { return handle != nullptr; }
		void OdbcHandle::read_errors(shared_ptr<vector<shared_ptr<OdbcError>>> & errors) const;
      
    private:

        void operator=(const OdbcHandle& orig) 
        {
            assert(false);
        }

        SQLHANDLE handle;
    };

	class OdbcEnvironmentHandle : public OdbcHandle
	{
	public:
		OdbcEnvironmentHandle() : OdbcHandle(SQL_HANDLE_ENV)
		{	
		}
	};

	class OdbcConnectionHandle : public OdbcHandle
	{
	public:
		OdbcConnectionHandle() : OdbcHandle(SQL_HANDLE_DBC)
		{
		}
	};

	class OdbcStatementHandle : public OdbcHandle
	{
	public:
		OdbcStatementHandle() : OdbcHandle(SQL_HANDLE_STMT)
		{
		}
	};	
}
