//---------------------------------------------------------------------------------------------------------------------------------
// File: Column.h
// Contents: Column objects from SQL Server to return as Javascript types
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

#include <stdafx.h>
#include <v8.h>

namespace mssql
{
	using namespace std;
	using namespace v8;

	class Column
	{
	public:
		Column(int id) : _id(id)
		{			
		}
		virtual ~Column();		
		virtual Local<Value> ToValue() = 0;
		int Id() const { return _id; }
	private:
		int _id;
	};
}
