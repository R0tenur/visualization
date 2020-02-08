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

namespace mssql
{
#pragma intrinsic( memset )


	// boilerplate macro for checking if SQL_NO_DATA was returned for field data
#define CHECK_ODBC_NO_DATA( r, handle ) {                                                                 \
    if( r == SQL_NO_DATA ) {                                                                              \
        error = make_shared<OdbcError>( OdbcError::NODE_SQL_NO_DATA.SqlState(), OdbcError::NODE_SQL_NO_DATA.Message(), \
            OdbcError::NODE_SQL_NO_DATA.Code() );                                                         \
        handle.Free();                                                                                    \
        return false;                                                                                     \
             } }

	// to use with numeric_limits below
#undef max

	namespace {

		// max characters within a (var)char field in SQL Server
		const int SQL_SERVER_MAX_STRING_SIZE = 8000;

		// default size to retrieve from a LOB field and we don't know the size
		const int LOB_PACKET_SIZE = 8192;
	}

}
