//---------------------------------------------------------------------------------------------------------------------------------
// File: Utility.h
// Contents: Utility functions used in Microsoft Driver for Node.js for SQL Server
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
#include <v8.h>
#include <sstream>
#include <map>
#include <mutex>
#include <ctime>

namespace mssql
{
    using namespace std;
    using namespace v8;

	/*
    inline Local<String> New(const wchar_t* text)
    {
	   return String::NewFromTwoByte(Isolate::GetCurrent(), reinterpret_cast<const uint16_t*>(text));
    }*/

    wstring FromV8String(Local<String> input);
	void encode_numeric_struct(double v, int precision, int upscale_limit, SQL_NUMERIC_STRUCT & numeric);

    string w2a(const wchar_t* input);

	struct clock_capture
	{
		double pc_freq = 0.0;
		__int64 counter_start = 0;
		bool status = true;
		const double conversion = 1000.0;

		clock_capture()
		{
			start_counter();
		}

		void start_counter()
		{
			LARGE_INTEGER li;
			status = QueryPerformanceFrequency(&li);
			pc_freq = double(li.QuadPart) / conversion;
			QueryPerformanceCounter(&li);
			counter_start = li.QuadPart;
		}

		double get_counter() const
		{
			LARGE_INTEGER li;
			QueryPerformanceCounter(&li);
			return double(li.QuadPart - counter_start) / pc_freq;
		}
	};

    struct nodeTypeFactory
    {
	   static const int64_t NANOSECONDS_PER_MS = 1000000;

	   Isolate *isolate;

	   nodeTypeFactory();
	   Local<Number> new_number(double d) const;
	   void scoped_callback(const Persistent<Function> & callback, int argc, Local<Value> args[]) const;
	   Local<Integer> new_integer(int32_t i) const;
	   Local<Integer> new_long(int64_t i) const;
	   Local<Boolean> new_boolean(bool b) const;
	   Local<Boolean> new_boolean(uint16_t n) const;
	   Local<Integer> new_int32(int32_t i) const;
	   Local<Number> new_int64(int64_t i) const;
	   Local<Object> new_object() const;
	   Local<Value> new_number() const;
	   Local<Integer> new_uint32(uint32_t n) const;
	   Local<String> new_string(const char *cstr) const;
	   Local<String> new_string(const char *cstr, int size) const;
	   Local<Array> new_array() const;
	   Local<Array> new_array(int count) const;
	   Local<Value> new_local_value(const Local<Value> & v) const;
	   Local<Function> newCallbackFunction(const Persistent<Function> & callback) const;
	   Local<FunctionTemplate> new_template(const FunctionCallback & callback) const;
	   Local<Object> new_object(const Persistent <Object> & bp) const;

	   Local<Value> new_buffer(int size) const;
	   Local<Object> error(const stringstream &full_error) const;
	   Local<Object> error(const char* full_error) const;
	   Local<Value> new_date() const;
	   Local<Value> new_date(double milliseconds, int32_t nanoseconds_delta) const;
	   Local<Value> global() const;
	   Local<Primitive> null() const;
	   Local<Primitive> undefined() const;
	   void throwError(const char * err) const;
	};
}
