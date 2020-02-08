#pragma once

// undo these tokens to use numeric_limits below

#include <BoundDatumHelper.h>

namespace mssql
{
	using namespace std;

	class MutateJS {
	public:
		static bool as_boolean(const Local<Value>& as_val);
		static Local<Value> get_property_as_value(const Local<Object>& o, const char* v);
		static Local<Value> get_property_as_value(const Local<Object>& o, const Local<Value>& v);
		static void set_property_value(const Local<Object>& o, const Local<Value>& p, const Local<Value>& v);
		static Local<Value> get_array_elelemt_at_index(const Local<Array> & arr, const int index);
		static void set_array_elelemt_at_index(const Local<Array>& arr, const int index, const Local<Value> & value);
		static int32_t getint32(Local<Object> query_object, const char* v);
		static int64_t getint64(Local<Object> query_object, const char* v);
		static int64_t getint64(Local<Number> l);
		static int32_t getint32(Local<Number> l);
		static Local<Value> get(Local<Object> o, const char* v);
		static bool getbool(Local<Object> query_object, const char* v);
		static Local<Value> from_two_byte(const wchar_t* text);
		static Local<Value> from_two_byte(const uint16_t* text);
		static Local<Value> from_two_byte(const uint16_t* text, size_t size);
	};
}
