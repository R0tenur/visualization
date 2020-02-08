#include "stdafx.h"
#include <MutateJS.h>

namespace mssql
{
	bool MutateJS::getbool(const Local<Object> query_object, const char* v)
	{
		const auto l = get(query_object, v);
		if (!l->IsNull())
		{
			return as_boolean(l);
		}
		return false;
	}

	Local<Value> MutateJS::get_property_as_value(const Local<Object>& o, const Local<Value>& v)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe = o->Get(context, v);
		const Local<Value> d;
		const auto val = maybe.FromMaybe(d);
		return val;
	}

	int32_t MutateJS::getint32(const Local<Object> query_object, const char* v)
	{
		nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto l = get(query_object, v);
		if (!l->IsNull())
		{
			const auto maybe = l->ToInt32(context);
			Local<Int32> local;
			if (maybe.ToLocal(&local))
			{
				return local->Value();
			}
		}
		return 0;
	}

	int32_t MutateJS::getint32(const Local<Number> l)
	{
		nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		if (!l->IsNull())
		{
			const auto maybe = l->ToInt32(context);
			Local<Int32> local;
			if (maybe.ToLocal(&local))
			{
				return local->Value();
			}
		}
		return 0;
	}

	int64_t MutateJS::getint64(const Local<Object> query_object, const char* v)
	{
		nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto l = get(query_object, v);
		if (!l->IsNull())
		{
			const auto maybe = l->ToBigInt(context);
			Local<BigInt> local;
			if (maybe.ToLocal(&local))
			{
				return local->Int64Value();
			}
		}
		return 0;
	}

	int64_t MutateJS::getint64(const Local<Number> l)
	{
		nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		if (!l->IsNull())
		{
			const auto maybe = l->ToBigInt(context);
			Local<BigInt> local;
			if (maybe.ToLocal(&local))
			{
				return local->Int64Value();
			}
		}
		return 0;
	}

	Local<Value> MutateJS::get(Local<Object> o, const char* v)
	{
		nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto vp = fact.new_string(v);
		const auto maybe = o->Get(context, vp);
		Local<Value> local;
		if (maybe.ToLocal(&local)) {
			return local;
		}
		return fact.null();
	}
	
#ifdef PRE_V13
	bool MutateJS::as_boolean(const Local<Value>& as_val) {
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		bool as_bool;
		if (!as_val->BooleanValue(context).To(&as_bool))
		{
			return false;
		}
		return  as_bool;
	}
	
	Local<Value> MutateJS::get_property_as_value(const Local<Object>& o, const char* v)
	{
		const nodeTypeFactory fact;
		const auto vp = fact.new_string(v);
		const auto val = o->Get(vp);
		return val;
	}
	
	Local<Value> MutateJS::get_array_elelemt_at_index(const Local<Array>& arr, const int index)
	{
		const auto elem = arr->Get(index);
		return elem;
	}

	void MutateJS::set_array_elelemt_at_index(const Local<Array>& arr, const int index, const Local<Value>& value)
	{
		arr->Set(index, value);
	}

	void MutateJS::set_property_value(const Local<Object>& o, const Local<Value>& p, const Local<Value>& v)
	{
		o->Set(p, v);
	}

	Local<Value> MutateJS::from_two_byte(const wchar_t* text)
	{
		const nodeTypeFactory fact;
		return String::NewFromTwoByte(fact.isolate, reinterpret_cast<const uint16_t*>(text));
	}

	Local<Value> MutateJS::from_two_byte(const uint16_t* text)
	{
		const nodeTypeFactory fact;
		return String::NewFromTwoByte(fact.isolate, text);
	}

	Local<Value> MutateJS::from_two_byte(const uint16_t* text, const size_t size)
	{
		const nodeTypeFactory fact;
		return String::NewFromTwoByte(fact.isolate, text, String::NewStringType::kNormalString, static_cast<int>(size));
	}

#else
 
	 Local<Value> MutateJS::get_property_as_value(const Local<Object>& o, const char* v)
	 {
		 const nodeTypeFactory fact;
		 const auto context = fact.isolate->GetCurrentContext();
		 const auto vp = fact.new_string(v);
		 const auto maybe = o->Get(context, vp);
		 const Local<Value> d;
		 const auto val = maybe.FromMaybe(d);
		 return val;
	 }

	 Local<Value> MutateJS::get_array_elelemt_at_index(const Local<Array> &arr, const int index)
	 {
		 const nodeTypeFactory fact;
		 const auto context = fact.isolate->GetCurrentContext();
		 const auto maybe = arr->Get(context, index);
		 const Local<Value> d;
		 const auto elem = maybe.FromMaybe(d);
		 return elem;
	 }
	
	 void MutateJS::set_array_elelemt_at_index(const Local<Array>& arr, const int index, const Local<Value>& value)
	 {
		 const nodeTypeFactory fact;
		 const auto context = fact.isolate->GetCurrentContext();
		 arr->Set(context, index, value);
	 }

	 void MutateJS::set_property_value(const Local<Object>& o, const Local<Value>& p, const Local<Value>& v)
	 {
		 const nodeTypeFactory fact;
		 const auto context = fact.isolate->GetCurrentContext();
		 o->Set(context, p, v);
	 }
	
	 Local<Value> MutateJS::from_two_byte(const uint16_t* text, const size_t size)
	 {
		 nodeTypeFactory fact;
		 auto context = fact.isolate->GetCurrentContext();
		 const auto maybe = String::NewFromTwoByte(context->GetIsolate(), text, NewStringType::kNormal, static_cast<int>(size));
		 const Local<Value> d;
		 return maybe.FromMaybe(d);
	 }

	 Local<Value> MutateJS::from_two_byte(const wchar_t* text)
	 {
		 nodeTypeFactory fact;
		 auto context = fact.isolate->GetCurrentContext();
		 const auto maybe = String::NewFromTwoByte(context->GetIsolate(), reinterpret_cast<const uint16_t*>(text), NewStringType::kNormal);
		 const Local<Value> d;
		 return maybe.FromMaybe(d);
	 }

	 Local<Value> MutateJS::from_two_byte(const uint16_t* text)
	 {
		 nodeTypeFactory fact;
		 auto context = fact.isolate->GetCurrentContext();
		 const auto maybe = String::NewFromTwoByte(context->GetIsolate(), text, NewStringType::kNormal);
		 const Local<Value> d;
		 return maybe.FromMaybe(d);
	 }

	 bool MutateJS::as_boolean(const Local<Value>& as_val) {
		 if (!as_val->IsNull())
		 {
			 const nodeTypeFactory fact;
			 const auto context = fact.isolate->GetCurrentContext();
			 return as_val->BooleanValue(context->GetIsolate());
		 }
		 return false;
	 }
	
#endif

}
