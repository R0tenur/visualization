//---------------------------------------------------------------------------------------------------------------------------------
// File: Utility.cpp
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

#include "stdafx.h"
#include <BoundDatumHelper.h>

namespace mssql
{
	using namespace v8;

	wstring FromV8String(const Local<String> input)
	{
		wstring result;
		const auto buffer_length = 256;
		uint16_t buffer[buffer_length];
		const nodeTypeFactory fact;
		const auto length = input->Length();
		result.reserve(length);
		auto read = 0;
		while (read < length)
		{
			const auto toread = min(buffer_length, length - read);
			const auto actual = input->Write(fact.isolate, buffer, read, toread);
			result.append(reinterpret_cast<const wchar_t*>(buffer), actual);
			read += actual;
		}

		return result;
	}

	string w2a(const wchar_t* input)
	{
		vector<char> message_buffer;
		const auto length = ::WideCharToMultiByte(CP_UTF8, 0, input, -1, nullptr, 0, nullptr, nullptr);
		if (length > 0)
		{
			// length includes null terminator
			message_buffer.resize(length);
			::WideCharToMultiByte(CP_UTF8, 0, input, -1, message_buffer.data(), static_cast<int>(message_buffer.size()), nullptr, nullptr);
		}
		return string(message_buffer.data());
	}

	int char2_int(const char input)
	{
		if (input >= '0' && input <= '9')
			return input - '0';
		if (input >= 'A' && input <= 'F')
			return input - 'A' + 10;
		if (input >= 'a' && input <= 'f')
			return input - 'a' + 10;
		throw invalid_argument("Invalid input string");
	}

	// This function assumes src to be a zero terminated sanitized string with
	// an even number of [0-9a-f] characters, and target to be sufficiently large

	int hex2_bin(const char* src, char* target)
	{
		auto len = 0;
		while (*src && src[1])
		{
			*(target++) = char2_int(*src) * 16 + char2_int(src[1]);
			src += 2;
			++len;
		}
		return len;
	}

	double round(const double val, const int dp)
	{
		const auto raised = pow(10, dp);
		const auto temp = val * raised;
		auto rounded = floor(temp);

		if (temp - rounded >= .5) {
			rounded = ceil(temp);
		}

		return rounded / raised;
	}

	string hexify(unsigned long long n)
	{
		string res;

		do
		{
			res += "0123456789ABCDEF"[n % 16];
			n >>= 4;
		} while (n);

		return string(res.rbegin(), res.rend());
	}

	void encode_numeric_struct(const double v, const int precision, int upscale_limit, SQL_NUMERIC_STRUCT & numeric) {
		auto encode = fabs(v);
		double intpart;
		auto scale = 0;
		char hex[SQL_MAX_NUMERIC_LEN];

		if (upscale_limit <= 0) upscale_limit = SQL_MAX_NUMERIC_LEN;

		auto dmod = modf(encode, &intpart);
		while (scale < upscale_limit && dmod != 0.0)
		{
			++scale;
			encode = encode * 10;
			dmod = modf(encode, &intpart);
		}

		const auto ull = static_cast<unsigned long long>(encode);
		memset(numeric.val, 0, SQL_MAX_NUMERIC_LEN);
		memset(hex, 0, SQL_MAX_NUMERIC_LEN);
		auto ss = hexify(ull);
		if (ss.size() % 2 == 1) ss = "0" + ss;
		const auto len = hex2_bin(ss.c_str(), hex);
		auto j = 0;
		for (auto i = len - 1; i >= 0; --i)
		{
			numeric.val[j++] = hex[i];
		}

		numeric.sign = v >= 0.0 ? 1 : 0;
		numeric.precision = precision > 0 ? precision : static_cast<SQLCHAR>(log10(encode) + 1);
		numeric.scale = min(upscale_limit, scale);
	}


	nodeTypeFactory::nodeTypeFactory()
	{
		isolate = Isolate::GetCurrent();
	}

	Local<Number> nodeTypeFactory::new_number(const double d) const
	{
		return Number::New(isolate, d);
	}

	void nodeTypeFactory::scoped_callback(const Persistent<Function> & callback, const int argc, Local<Value> args[]) const
	{
		nodeTypeFactory fact;
		auto cons = newCallbackFunction(callback);
		auto context = isolate->GetCurrentContext();
		const auto global = context->Global();
		cons->Call(context, global, argc, args);
	}

	Local<Integer> nodeTypeFactory::new_integer(const int32_t i) const
	{
		return Integer::New(isolate, i);
	}

	Local<Integer> nodeTypeFactory::new_long(const int64_t i) const
	{
		return Integer::New(isolate, static_cast<int32_t>(i));
	}

	Local<Boolean> nodeTypeFactory::new_boolean(const bool b) const
	{
		return Boolean::New(isolate, b);
	}

	Local<Boolean> nodeTypeFactory::new_boolean(const uint16_t n) const
	{
		return Boolean::New(isolate, n != 0);
	}

	Local<Integer> nodeTypeFactory::new_int32(const int32_t i) const
	{
		return Int32::New(isolate, i);
	}

	Local<Number> nodeTypeFactory::new_int64(const int64_t i) const
	{
		return Number::New(isolate, static_cast<double>(i));
	}

	Local<Object> nodeTypeFactory::new_object() const
	{
		return Object::New(isolate);
	}

	Local<Value> nodeTypeFactory::new_number() const
	{
		return Object::New(isolate);
	}

	Local<Integer> nodeTypeFactory::new_uint32(const uint32_t n) const
	{
		return Integer::New(isolate, n);
	}

#ifdef PRE_V13
	Local<String> nodeTypeFactory::new_string(const char *cstr) const
	{
		return String::NewFromUtf8(isolate, cstr);
	}

	Local<String> nodeTypeFactory::new_string(const char *cstr, const int size) const
	{
		return String::NewFromUtf8(isolate, cstr, String::NewStringType::kNormalString, size);
	}
#else
	Local<String> nodeTypeFactory::new_string(const char* cstr) const
	{
		const auto maybe = String::NewFromUtf8(isolate, cstr);
		const Local<String> d;
		const auto v = maybe.FromMaybe(d);
		return v;
	}

	Local<String> nodeTypeFactory::new_string(const char* cstr, const int size) const
	{
		const auto maybe = String::NewFromUtf8(isolate, cstr, NewStringType::kNormal, size);
		const Local<String> d;
		const auto v = maybe.FromMaybe(d);
		return v;
	}
#endif

	Local<Array> nodeTypeFactory::new_array() const
	{
		return Array::New(isolate);
	}

	Local<Array> nodeTypeFactory::new_array(const int count) const
	{
		return Array::New(isolate, count);
	}

	Local<Value> nodeTypeFactory::new_local_value(const Local<Value> & v) const
	{
		return Local<Value>::New(isolate, v);
	}

	Local<Function> nodeTypeFactory::newCallbackFunction(const Persistent<Function> & callback) const
	{
		return Local<Function>::New(isolate, callback);
	}

	Local<FunctionTemplate> nodeTypeFactory::new_template(const FunctionCallback & callback) const
	{
		return FunctionTemplate::New(isolate, callback);
	}

	Local<Object> nodeTypeFactory::new_object(const Persistent <Object> & bp) const
	{
		return Local<Object>::New(isolate, bp);
	}

	Local<Value> nodeTypeFactory::new_buffer(const int size) const
	{
		return node::Buffer::New(isolate, size)
#ifdef NODE_GYP_V4 
			.ToLocalChecked()
#endif
			;
	}

	Local<Object> nodeTypeFactory::error(const stringstream &full_error) const
	{
		const auto err = Local<Object>::Cast(Exception::Error(new_string(full_error.str().c_str())));
		return err;
	}

	Local<Object> nodeTypeFactory::error(const char* full_error) const
	{
		const auto err = Local<Object>::Cast(Exception::Error(new_string(full_error)));
		return err;
	}

	Local<Value> nodeTypeFactory::new_date() const
	{
		const auto dd = Date::New(isolate->GetCurrentContext(), 0.0);
		Local<Value> d;
		if (dd.ToLocal(&d))
		{
			return d;
		}
		return d;
	}

#ifdef PRE_V13
	Local<Value> nodeTypeFactory::new_date(const double milliseconds, const int32_t nanoseconds_delta) const
	{
		const auto ns = String::NewFromUtf8(isolate, "nanosecondsDelta");
		const auto n = Number::New(isolate, nanoseconds_delta / (NANOSECONDS_PER_MS * 1000.0));
		// include the properties for items in a DATETIMEOFFSET that are not included in a JS Date object
		const auto context = isolate->GetCurrentContext();
		const auto dd = Date::New(context, milliseconds);
		Local<Value> d;
		if (dd.ToLocal(&d)) {
			const auto maybe = d->ToObject(context);
			Local<Object> local;
			if (maybe.ToLocal(&local)) {
				local->Set(ns, n);
			}
		}
		return d;
	}
#else
	Local<Value> nodeTypeFactory::new_date(const double milliseconds, const int32_t nanoseconds_delta) const
	{
		const auto ns = String::NewFromUtf8(isolate, "nanosecondsDelta");
		const auto n = Number::New(isolate, nanoseconds_delta / (NANOSECONDS_PER_MS * 1000.0));
		// include the properties for items in a DATETIMEOFFSET that are not included in a JS Date object
		const auto context = isolate->GetCurrentContext();
		const auto dd = Date::New(context, milliseconds);
		Local<Value> d;
		if (dd.ToLocal(&d)) {
			const auto maybe = d->ToObject(context);
			Local<Object> local;
			if (maybe.ToLocal(&local)) {
				const Local<String> ds;
				const auto ls = ns.FromMaybe(ds);
				local->Set(context, ls, n);
			}
		}
		return d;
	}
#endif
	Local<Value> nodeTypeFactory::global() const
	{
		return isolate->GetCurrentContext()->Global();
	}

	Local<Primitive> nodeTypeFactory::null() const
	{
		return Null(isolate);
	}

	Local<Primitive> nodeTypeFactory::undefined() const
	{
		return Undefined(isolate);
	}

	void nodeTypeFactory::throwError(const char * err) const
	{
		isolate->ThrowException(error(err));
	}
}