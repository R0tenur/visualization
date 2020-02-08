#include <QueryOperationParams.h>
#include <MutateJS.h>

namespace mssql
{
	using namespace std;
	using namespace v8;

	QueryOperationParams::QueryOperationParams(const Local<Number> query_id, const Local<Object> query_object)
	{
		const auto qs = MutateJS::get(query_object, "query_str");
		nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe = qs->ToString(context);
		Local<String> local;
		if (maybe.ToLocal(&local)) {
			_query_string = FromV8String(local);
		}
		_timeout = MutateJS::getint32(query_object, "query_timeout");
		_polling = MutateJS::getbool(query_object, "query_polling");
		_query_tz_adjustment = MutateJS::getint32(query_object, "query_tz_adjustment");
		_id = MutateJS::getint32(query_id); // getint64(query_id); //  query_id->NumberValue();
	}
}
