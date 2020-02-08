//---------------------------------------------------------------------------------------------------------------------------------
// File: OperationManager.h
// Contents: Queue calls to ODBC on background thread
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
#include <map>
#include <memory>
#include <stdafx.h>

namespace mssql {

	using namespace std;

	class Operation;

	/* need to think about threading with multiple active connections */

	class OperationManager
	{
		typedef map<size_t, shared_ptr<Operation>> map_operations_t;

	public:
		OperationManager();
		~OperationManager();
		bool add(shared_ptr<Operation> operation_ptr);
		void check_in_operation(size_t id);
		shared_ptr<Operation> get_operation(int id)
		{
			map_operations_t::const_iterator itr = operations.find(id);
			return itr->second;
		}

	private:
		map_operations_t operations;
		ssize_t _id;
		static void on_background(uv_work_t* work);
		static void on_foreground(uv_work_t* work);
		mutex g_i_mutex;
	};
}
