#pragma once

#include <stdafx.h>

namespace mssql
{
	using namespace std;
	using namespace v8;

	class QueryOperationParams
	{
	public:

		wstring query_string() { return _query_string; }
		int64_t id() { return _id; }
		int32_t timeout() { return _timeout; }
		int32_t query_tz_adjustment() { return _query_tz_adjustment; }
		bool polling() { return _polling; }
		
		QueryOperationParams(Local<Number> query_id, Local<Object> query_object);
	private:
		wstring _query_string;
		int32_t _timeout;
		int32_t _query_tz_adjustment;
		int64_t _id;
		bool _polling;
	};
}
