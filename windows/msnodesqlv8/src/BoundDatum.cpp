#include <TimestampColumn.h>
#include <BoundDatum.h>
#include <MutateJS.h>
#include <codecvt>

namespace mssql
{
	const int sql_server_2008_default_time_precision = 16;
	const int sql_server_2008_default_datetime_precision = 34;
	const int sql_server_2008_default_timestamp_precision = 27;
	const int sql_server_2008_default_datetime_scale = 7;

	static Local<Boolean> get_as_bool(const Local<Value> o, const char* v)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto vp = fact.new_string(v);
		const auto false_val = fact.new_boolean(false);
		if (o->IsNull())
		{
			return false_val;
		}
		if (!o->IsObject())
		{
			return false_val;
		}
		Local<Object> as_obj;
		if (!o->ToObject(context).ToLocal(&as_obj))
		{
			return false_val;
		}
		if (as_obj->IsNull())
		{
			return false_val;
		}
		Local<Value> as_val;
		if (!as_obj->Get(context, vp).ToLocal(&as_val))
		{
			return false_val;
		}
		if (as_val->IsNull())
		{
			return false_val;
		}
		
		const auto as_bool = MutateJS::as_boolean(as_val);
		return fact.new_boolean(as_bool);
	}

	bool sql_type_s_maps_to_tvp(const Local<Value> p)
	{
		const auto is_user_defined = get_as_bool(p, "is_user_defined");
		if (is_user_defined->IsNull()) return false;
		const auto as_bool = MutateJS::as_boolean(is_user_defined);	
		return as_bool;
	}

	bool BoundDatum::bind(Local<Value>& p)
	{
		auto res = false;
		if (sql_type_s_maps_to_tvp(p))
		{
			bind_tvp(p);
			return true;
		}
		if (p->IsArray())
		{
			res = bind_array(p);
		}
		else if (p->IsObject())
		{
			res = bind_object(p);
		}
		if (!res) res = bind_datum_type(p);
		return res;
	}

	static Local<String> get_as_string(const Local<Value> o, const char* v)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto vp = fact.new_string(v);
		const auto maybe = o->ToObject(context);
		Local<Object> local;
		if (maybe.ToLocal(&local))
		{
			const auto maybe_value = local->Get(context, vp);
			Local<Value> local_value;
			if (maybe_value.ToLocal(&local_value))
			{
				const auto maybe_string = local_value->ToString(context);
				const auto default_string = String::Empty(fact.isolate);
				return maybe_string.FromMaybe(default_string);
			}
		}

		return String::Empty(fact.isolate);
	}

	void BoundDatum::bind_null(const Local<Value>& p)
	{
		reserve_null(1);
		_indvec[0] = SQL_NULL_DATA;
	}

	void BoundDatum::bind_null_array(const Local<Value>& p)
	{
		const auto arr = Local<Array>::Cast(p);
		const auto len = arr->Length();
		reserve_null(len);
		for (uint32_t i = 0; i < len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
		}
	}

	void BoundDatum::reserve_null(const SQLLEN len)
	{
		buffer_len = 0;
		_indvec.resize(len);
		js_type = JS_NULL;
		c_type = SQL_C_CHAR;
		sql_type = SQL_CHAR;
		param_size = 1;
		digits = 0;
		buffer = nullptr;
	}

	void BoundDatum::bind_w_long_var_char(const Local<Value>& p)
	{
		bind_w_var_char(p);
		sql_type = SQL_WLONGVARCHAR;
		param_size = buffer_len;
	}

	void BoundDatum::bind_w_var_char(const Local<Value>& p)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe = p->ToString(context);
		Local<String> str_param;
		if (maybe.ToLocal(&str_param)) {
			bind_w_var_char(p, str_param->Length());
		}
	}

	void BoundDatum::bind_char(const Local<Value>& p)
	{
		bind_var_char(p);
	}

	void BoundDatum::bind_var_char(const Local<Value>& p)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe = p->ToString(context);
		Local<String> local;
		if (maybe.ToLocal(&local)) {
			SQLULEN precision = local->Length();
			if (param_size > 0) precision = min(param_size, precision);
			bind_var_char(p, static_cast<int>(precision));
		}
	}

	void BoundDatum::reserve_var_char(const size_t precision)
	{
		js_type = JS_STRING;
		c_type = SQL_C_CHAR;
		sql_type = SQL_VARCHAR;
		digits = 0;
		_indvec[0] = SQL_NULL_DATA;
		_storage->ReserveChars(max(1, static_cast<int>(precision)));
		auto* itr_p = _storage->charvec_ptr->data();
		buffer = itr_p;
		buffer_len = precision;
		param_size = max(buffer_len, static_cast<SQLLEN>(1));
	}

	void BoundDatum::bind_var_char(const Local<Value>& p, const int precision)
	{
		reserve_var_char(precision);
		if (!p->IsNull())
		{
			const nodeTypeFactory fact;
			const auto context = fact.isolate->GetCurrentContext();
			const auto maybe = p->ToString(context);
			Local<String> str_param;
			if (maybe.ToLocal(&str_param)) {
				str_param->WriteUtf8(fact.isolate, _storage->charvec_ptr->data(), precision);
				_indvec[0] = precision;
			}
		}
	}

	int get_max_str_len(const Local<Value>& p)
	{
		auto str_len = 0;
		auto arr = Local<Array>::Cast(p);
		const auto len = arr->Length();
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		for (uint32_t i = 0; i < len; ++i)
		{
			auto maybe_value = arr->Get(context, i);
			
			Local<Value> local_value;
			if (maybe_value.ToLocal(&local_value))
			{
				Local<String> str;
				auto maybe_string = local_value->ToString(context);
				if (maybe_string.ToLocal(&str)) {
					if (str->Length() > str_len) {
						str_len = str->Length();
					}
				}
			}
		}
		return str_len;
	}

	void BoundDatum::reserve_w_var_char_array(const size_t max_str_len, const size_t array_len)
	{
		js_type = JS_STRING;
		c_type = SQL_C_WCHAR;
		sql_type = max_str_len > 2000 && max_str_len < 4000 ? SQL_WLONGVARCHAR : SQL_WVARCHAR;

		const auto size = sizeof(uint16_t);
		_indvec.resize(array_len);
		_storage->ReserveUint16(array_len * max_str_len);
		buffer = _storage->uint16vec_ptr->data();
		buffer_len = max_str_len * size;
		param_size = max_str_len;
	}

	void BoundDatum::bind_w_var_char_array(const Local<Value>& p)
	{
		const auto max_str_len = max(1, get_max_str_len(p));
		auto arr = Local<Array>::Cast(p);
		const auto array_len = arr->Length();
		const auto size = sizeof(uint16_t);
		reserve_w_var_char_array(max_str_len, array_len);
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		auto itr = _storage->uint16vec_ptr->begin();
		for (uint32_t i = 0; i < array_len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
			const auto elem = MutateJS::get_array_elelemt_at_index(arr, i);
			if (!elem->IsNull())
			{
				auto maybe_value = arr->Get(context, i);
				
				Local<Value> local_value;
				if (maybe_value.ToLocal(&local_value))
				{
					Local<String> str;
					auto maybe_string = local_value->ToString(context);
					if (maybe_string.ToLocal(&str)) {
						const auto width = str->Length() * size;
						_indvec[i] = width;
						str->Write(fact.isolate, &*itr, 0, max_str_len);
					}
				}
			}
			itr += max_str_len;
		}
	}

	void BoundDatum::bind_w_var_char(const Local<Value>& p, const int precision)
	{
		const size_t max_str_len = max(1, precision);
		const auto size = sizeof(uint16_t);
		reserve_w_var_char_array(max_str_len, 1);
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		_indvec[0] = SQL_NULL_DATA;
		if (!p->IsNull())
		{
			const auto maybe = p->ToString(context);
			Local<String> str_param;
			if (maybe.ToLocal(&str_param)) {
				const auto first_p = _storage->uint16vec_ptr->data();
				str_param->Write(fact.isolate, first_p, 0, precision);
				buffer_len = precision * size;
				if (precision > 4000)
				{
					param_size = 0;
				}
				else
				{
					param_size = max(buffer_len, static_cast<SQLLEN>(1));
				}
				_indvec[0] = buffer_len;
			}
		}
	}

	size_t get_max_object_len(const Local<Value>& p)
	{
		size_t obj_len = 0;
		auto arr = Local<Array>::Cast(p);
		const auto len = arr->Length();
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		for (uint32_t i = 0; i < len; ++i)
		{
			auto maybe = arr->Get(context, i);
			Local<Value> local;
			if (maybe.ToLocal(&local)) {
				auto maybe_instance = local->ToObject(context);
				Local<Object> local_instance;
				if (maybe_instance.ToLocal(&local_instance))
				{
					const auto width = node::Buffer::Length(local_instance);
					if (width > obj_len) obj_len = width;
				}
			}
		}
		return obj_len;
	}

	void BoundDatum::bind_long_var_binary(Local<Value>& p)
	{
		bind_var_binary(p);
		sql_type = SQL_LONGVARBINARY;
	}

	void BoundDatum::reserve_var_binary_array(const size_t max_obj_len, const size_t array_len)
	{
		js_type = JS_BUFFER;
		c_type = SQL_C_BINARY;
		sql_type = max_obj_len > 2000 ? SQL_LONGVARBINARY : SQL_VARBINARY;
		digits = 0;
		const auto size = sizeof(uint8_t);
		_storage->ReserveChars(array_len * max_obj_len);
		_indvec.resize(array_len);
		buffer = _storage->charvec_ptr->data();
		buffer_len = max_obj_len * size;
		param_size = max_obj_len;
	}

	/*
	 *const auto r = SQLBindParameter(*_statement, current_param, datum.param_type, datum.c_type, datum.sql_type,
									  datum.param_size, datum.digits, datum.buffer, datum.buffer_len, datum.get_ind_vec().data());


									  retcode = SQLBindParameter(
									  hstmt,              // Statement handle
				current_param		1,                  // Parameter Number
				param_type			SQL_PARAM_INPUT,    // Input/Output Type (always INPUT for TVP)
				c_type				SQL_C_DEFAULT,      // C - Type (always this for a TVP)
				sql_type			SQL_SS_TABLE,       // SQL Type (always this for a TVP)
				param_size			MAX_ARRAY_SIZE,     // For a TVP this is max rows we will use
				digits				0,                  // For a TVP this is always 0
				buffer				TVPTableName,       // For a TVP this is the type name of the
									  // TVP, and also a token returned by
									  // SQLParamData.
				buffer_len			SQL_NTS,            // For a TVP this is the length of the type
									  // name or SQL_NTS.
									  &lTVPRowsUsed);     // For a TVP this is the number of rows
									  // actually available.
	 */

	static int get_row_count(Local<Value>& p)
	{
		auto rows = 1;
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe_object = p->ToObject(context);
		Local<Object> local;
		if (maybe_object.ToLocal(&local)) {
			const auto row_count_int = MutateJS::get_property_as_value(local, "row_count");
			if (!row_count_int->IsNull())
			{
				const auto maybe = row_count_int->Int32Value(context);
				if (!maybe.IsNothing()) {
					rows = maybe.ToChecked();
				}
			}
		}
		return rows;
	}

	wstring wide_from_js_string(const Local<String> s)
	{
		const nodeTypeFactory fact;
		wstring_convert<codecvt_utf8_utf16<wchar_t>> converter;
		char tmp[1 * 1024];
		const auto precision = min(1024, s->Length() + 1);
		s->WriteUtf8(fact.isolate, tmp, precision);
		const string narrow(tmp);
		const auto wide = converter.from_bytes(narrow);
		return wide;
	}

	void BoundDatum::bind_tvp(Local<Value>& p)
	{
		wstring_convert<codecvt_utf8_utf16<wchar_t>> converter;
		// string narrow = converter.to_bytes(wide_utf16_source_string);
		// fprintf(stderr, "bind tvp\n");
		is_tvp = true;
		param_type = SQL_PARAM_INPUT;
		c_type = SQL_C_DEFAULT;
		sql_type = SQL_SS_TABLE;
		const auto rows = get_row_count(p);
		const auto type_id_str = get_as_string(p, "type_id");
		const auto schema_str = get_as_string(p, "schema");
		const nodeTypeFactory fact;
		if (!schema_str->IsNull())
		{
			_storage->schema = wide_from_js_string(schema_str);
		}
		_indvec.resize(1);
		const auto precision = type_id_str->Length();
		_storage->ReserveChars(static_cast<size_t>(precision) + 1);
		_storage->ReserveUint16(static_cast<size_t>(precision) + 1);
		auto* itr_p = _storage->charvec_ptr->data();
		type_id_str->WriteUtf8(fact.isolate, itr_p, precision);
		const string narrow = _storage->charvec_ptr->data();
		const auto wide = converter.from_bytes(narrow);
		memcpy(static_cast<void*>(_storage->uint16vec_ptr->data()), wide.c_str(), precision * sizeof(uint16_t));
		buffer = _storage->uint16vec_ptr->data();
		buffer_len = precision * sizeof(uint16_t);
		param_size = rows; // max no of rows.
		_indvec[0] = rows; // no of rows.
		digits = 0;
	}

	void BoundDatum::bind_var_binary(Local<Value>& p)
	{
		const auto o = p.As<Object>();
		_indvec[0] = SQL_NULL_DATA;
		const auto obj_len = !o->IsNull() ? node::Buffer::Length(o) : 0;
		reserve_var_binary_array(obj_len, 1);

		if (!o->IsNull())
		{
			const auto itr = _storage->charvec_ptr->begin();
			const auto ptr = node::Buffer::Data(o);
			_indvec[0] = obj_len;
			memcpy(&*itr, ptr, obj_len);
		}
	}

	void BoundDatum::bind_var_binary_array(const Local<Value>& p)
	{
		const auto arr = Local<Array>::Cast(p);
		const auto array_len = arr->Length();
		const auto max_obj_len = get_max_object_len(p);
		reserve_var_binary_array(max_obj_len, array_len);
		auto itr = _storage->charvec_ptr->data();
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		for (uint32_t i = 0; i < array_len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
			const auto maybe_elem = arr->Get(context, i);
			Local<Value> elem;
			if (maybe_elem.ToLocal(&elem)) {
				if (!elem->IsNull())
				{
					auto maybe_object = elem->ToObject(context);
					Local<Object> local_object;
					if (maybe_object.ToLocal(&local_object)) {
						const auto ptr = node::Buffer::Data(local_object);
						const auto obj_len = node::Buffer::Length(local_object);
						_indvec[i] = obj_len;
						memcpy(&*itr, ptr, obj_len);
					}
				}
				itr += max_obj_len;
			}
		}
	}

	void BoundDatum::bind_boolean(const Local<Value>& p)
	{
		reserve_boolean(1);
		auto& vec = *_storage->charvec_ptr;
		_indvec[0] = SQL_NULL_DATA;
		if (!p->IsNull())
		{
			const auto v = MutateJS::as_boolean(p);
			vec[0] = !v ? 0 : 1;
			_indvec[0] = 0;
		}
	}

	void BoundDatum::bind_boolean_array(const Local<Value>& p)
	{
		const auto arr = Local<Array>::Cast(p);
		const auto len = arr->Length();
		reserve_boolean(len);
		auto& vec = *_storage->charvec_ptr;	
		for (uint32_t i = 0; i < len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
			const auto elem = MutateJS::get_array_elelemt_at_index(arr, i);
			if (!elem->IsNull())
			{
				const auto v = MutateJS::as_boolean(elem);
				const auto b = !v ? 0 : 1;
				vec[i] = b;
				_indvec[i] = 0;
			}
		}
	}

	void BoundDatum::reserve_boolean(const SQLLEN len)
	{
		const auto size = sizeof(char);
		buffer_len = len * size;
		_storage->ReserveChars(len);
		_indvec.resize(len);
		js_type = JS_BOOLEAN;
		c_type = SQL_C_BIT;
		sql_type = SQL_BIT;
		buffer = _storage->charvec_ptr->data();
		param_size = size;
		digits = 0;
	}

	void BoundDatum::bind_numeric(const Local<Value>& p)
	{
		reserve_numeric(1);
		sql_type = SQL_NUMERIC;
		_indvec[0] = SQL_NULL_DATA;
		if (!p->IsNull())
		{
			nodeTypeFactory fact;
			const auto context = fact.isolate->GetCurrentContext();
			const auto maybe = p->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				const auto d = local->Value();
				auto& vec = *_storage->numeric_ptr;
				auto& ns = vec[0];
				encode_numeric_struct(d, static_cast<int>(param_size), digits, ns);
				param_size = ns.precision;
				digits = ns.scale;
				_indvec[0] = sizeof(SQL_NUMERIC_STRUCT);
			}
		}
	}

	void BoundDatum::bind_numeric_array(const Local<Value>& p)
	{
		const auto arr = Local<Array>::Cast(p);
		const int len = arr->Length();
		reserve_numeric(len);
		auto& vec = *_storage->numeric_ptr;
		for (auto i = 0; i < len; ++i)
		{
			auto& ns = vec[i];
			_indvec[i] = SQL_NULL_DATA;
			const auto elem = MutateJS::get_array_elelemt_at_index(arr, i);
			if (!elem->IsNull())
			{
				const Local<Number> local;
				const auto d = local->Value();
				encode_numeric_struct(d, static_cast<int>(param_size), digits, ns);
				param_size = ns.precision;
				digits = ns.scale;
				_indvec[i] = sizeof(SQL_NUMERIC_STRUCT);
			}
		}
	}

	void BoundDatum::reserve_numeric(const SQLLEN len)
	{
		definedPrecision = true;
		buffer_len = len * sizeof(SQL_NUMERIC_STRUCT);
		_storage->ReserveNumerics(len);
		_indvec.resize(len);
		js_type = JS_NUMBER;
		c_type = SQL_C_NUMERIC;
		sql_type = SQL_NUMERIC;
		buffer = _storage->numeric_ptr->data();
	}

	void BoundDatum::bind_tiny_int(const Local<Value>& p)
	{
		bind_int32(p);
		sql_type = SQL_TINYINT;
	}

	void BoundDatum::bind_small_int(const Local<Value>& p)
	{
		bind_int32(p);
		sql_type = SQL_SMALLINT;
	}

	void BoundDatum::bind_int32(const Local<Value>& p)
	{
		reserve_int32(1);
		_indvec[0] = SQL_NULL_DATA;
		auto& vec = *_storage->int32vec_ptr;
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		vec[0] = SQL_NULL_DATA;
		if (!p->IsNull())
		{
			const auto maybe = p->ToInt32(context);
			Local<Int32> local;
			if (maybe.ToLocal(&local)) {
				const auto d = local->Value();
				vec[0] = d;
				_indvec[0] = 0;
			}
		}
	}

	void BoundDatum::bind_int32_array(const Local<Value>& p)
	{
		auto arr = Local<Array>::Cast(p);
		const int len = arr->Length();
		reserve_int32(len);
		auto& vec = *_storage->int32vec_ptr;
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		for (auto i = 0; i < len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
			const auto maybe_elem = arr->Get(context, i);
			Local<Value> elem;
			if (maybe_elem.ToLocal(&elem)) {
				if (!elem->IsNull())
				{
					const auto maybe = elem->ToInt32(context);
					Local<Int32> local;
					if (maybe.ToLocal(&local)) {
						vec[i] = local->Value();
						_indvec[i] = 0;
					}
				}
			}
		}
	}

	void BoundDatum::reserve_int32(const SQLLEN len)
	{
		const auto size = sizeof(int32_t);
		buffer_len = len * size;
		_storage->ReserveInt32(len);
		_indvec.resize(len);
		js_type = JS_INT;
		c_type = SQL_C_SLONG;
		sql_type = SQL_INTEGER;
		buffer = _storage->int32vec_ptr->data();
		param_size = size;
		digits = 0;
	}

	void BoundDatum::bind_uint32(const Local<Value>& p)
	{
		reserve_uint32(1);
		auto& vec = *_storage->uint32vec_ptr;
		_indvec[0] = SQL_NULL_DATA;
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		if (!p->IsNull())
		{
			const auto maybe = p->ToUint32(context);
			Local<Uint32> local;
			if (maybe.ToLocal(&local)) {
				vec[0] = local->Value();
				_indvec[0] = 0;
			}
		}
	}

	void BoundDatum::bind_uint32_array(const Local<Value>& p)
	{
		const auto arr = Local<Array>::Cast(p);
		const auto len = arr->Length();
		reserve_uint32(len);
		auto& vec = *_storage->uint32vec_ptr;
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		for (uint32_t i = 0; i < len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
			const auto maybe_elem = arr->Get(context, i);
			Local<Value> elem;
			if (maybe_elem.ToLocal(&elem)) {
				if (!elem->IsNull())
				{
					auto maybe = elem->ToUint32(context);
					Local<Uint32> local;
					if (maybe.ToLocal(&local)) {
						vec[i] = local->Value();
						_indvec[i] = 0;
					}
				}
			}
		}
	}

	void BoundDatum::reserve_uint32(const SQLLEN len)
	{
		const auto size = sizeof(uint32_t);
		buffer_len = len * size;
		_storage->ReserveUInt32(len);
		_indvec.resize(len);
		js_type = JS_UINT;
		c_type = SQL_C_ULONG;
		sql_type = SQL_BIGINT;
		buffer = _storage->uint32vec_ptr->data();
		param_size = size;
		digits = 0;
	}

	void BoundDatum::bind_date(const Local<Value>& p)
	{
		reserve_date(1);
		// Since JS dates have no timezone context, all dates are assumed to be UTC
		_indvec[0] = SQL_NULL_DATA;
		if (!p->IsNull())
		{
			const nodeTypeFactory fact;
			const auto context = fact.isolate->GetCurrentContext();
			const auto date_object = Local<Date>::Cast<Value>(p);
			assert(!date_object.IsEmpty());
			// dates in JS are stored internally as ms count from Jan 1, 1970
			const auto maybe = date_object->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				const auto d = local->Value();
				const TimestampColumn sql_date(-1, d);
				auto& dt = (*_storage->datevec_ptr)[0];
				sql_date.ToDateStruct(dt);
				_indvec[0] = buffer_len;
			}
		}
	}

	void BoundDatum::reserve_date(SQLLEN len)
	{
		buffer_len = len * sizeof(SQL_DATE_STRUCT);
		_storage->datevec_ptr = make_shared<vector<SQL_DATE_STRUCT>>(len);
		_indvec.resize(len);
		// Since JS dates have no timezone context, all dates are assumed to be UTC		
		js_type = JS_DATE;
		c_type = SQL_C_TYPE_DATE;
		// TODO: Determine proper SQL type based on version of server we're talking to
		sql_type = SQL_TYPE_DATE;
		buffer = _storage->datevec_ptr->data();
		// TODO: Determine proper precision and size based on version of server we're talking to
		if (param_size <= 0)
			param_size = sql_server_2008_default_datetime_precision;
		digits = sql_server_2008_default_datetime_scale;
	}

	void BoundDatum::bind_time(const Local<Value>& p)
	{
		reserve_time(1);
		// Since JS dates have no timezone context, all dates are assumed to be UTC
		_indvec[0] = SQL_NULL_DATA;
		if (!p->IsNull())
		{
			const nodeTypeFactory fact;
			const auto context = fact.isolate->GetCurrentContext();
			const auto date_object = Local<Date>::Cast<Value>(p);
			assert(!date_object.IsEmpty());
			// dates in JS are stored internally as ms count from Jan 1, 1970
			const auto maybe = date_object->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				const TimestampColumn sql_date(-1, local->Value());
				auto& time2 = (*_storage->time2vec_ptr)[0];
				sql_date.ToTime2Struct(time2);
				_indvec[0] = buffer_len;
			}
		}
	}

	void BoundDatum::reserve_time(const SQLLEN len)
	{
		buffer_len = len * sizeof(SQL_SS_TIME2_STRUCT);
		_storage->Reservetime2(len);
		_indvec.resize(len);
		// Since JS dates have no timezone context, all dates are assumed to be UTC		
		js_type = JS_DATE;
		c_type = SQL_C_BINARY;
		// TODO: Determine proper SQL type based on version of server we're talking to
		sql_type = SQL_SS_TIME2;
		buffer = _storage->time2vec_ptr->data();
		// TODO: Determine proper precision and size based on version of server we're talking to

		param_size = sql_server_2008_default_time_precision;
		if (digits <= 0) digits = sql_server_2008_default_datetime_scale;
	}

	void BoundDatum::bind_time_stamp(const Local<Value>& p)
	{
		reserve_time_stamp(1);
		// Since JS dates have no timezone context, all dates are assumed to be UTC
		_indvec[0] = SQL_NULL_DATA;
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		if (!p->IsNull())
		{
			const auto date_object = Local<Date>::Cast<Value>(p);
			assert(!date_object.IsEmpty());
			// dates in JS are stored internally as ms count from Jan 1, 1970
			const auto maybe = date_object->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				const TimestampColumn sql_date(-1, local->Value());
				auto& timestamp = (*_storage->timestampvec_ptr)[0];
				sql_date.to_timestamp_struct(timestamp);
				_indvec[0] = buffer_len;
			}
		}
	}

	void BoundDatum::reserve_time_stamp(const SQLLEN len)
	{
		buffer_len = len * sizeof(SQL_TIMESTAMP_STRUCT);
		_storage->ReserveTimestamp(len);
		_indvec.resize(len);
		// Since JS dates have no timezone context, all dates are assumed to be UTC		
		js_type = JS_DATE;
		c_type = SQL_C_TIMESTAMP;
		// TODO: Determine proper SQL type based on version of server we're talking to
		sql_type = SQL_TYPE_TIMESTAMP;
		buffer = _storage->timestampvec_ptr->data();
		// TODO: Determine proper precision and size based on version of server we're talking to
		param_size = sql_server_2008_default_timestamp_precision;
		if (digits <= 0) digits = sql_server_2008_default_datetime_scale;
	}

	void BoundDatum::bind_time_stamp_offset(const Local<Value>& p)
	{
		reserve_time_stamp_offset(1);
		// Since JS dates have no timezone context, all dates are assumed to be UTC
		_indvec[0] = SQL_NULL_DATA;
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		if (!p->IsNull())
		{
			const auto date_object = Local<Date>::Cast<Value>(p);
			assert(!date_object.IsEmpty());
			// dates in JS are stored internally as ms count from Jan 1, 1970
			const auto maybe = date_object->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				auto& ts = (*_storage->timestampoffsetvec_ptr)[0];
				const TimestampColumn sql_date(-1, local->Value(), 0, offset);
				sql_date.to_timestamp_offset(ts);
				_indvec[0] = buffer_len;
			}
		}
	}

	void BoundDatum::reserve_time_stamp_offset(SQLLEN len)
	{
		buffer_len = sizeof(SQL_SS_TIMESTAMPOFFSET_STRUCT);
		_storage->timestampoffsetvec_ptr = make_shared<vector<SQL_SS_TIMESTAMPOFFSET_STRUCT>>(len);
		_indvec.resize(len);
		// Since JS dates have no timezone context, all dates are assumed to be UTC		
		js_type = JS_DATE;
		c_type = SQL_C_BINARY;
		// TODO: Determine proper SQL type based on version of server we're talking to
		sql_type = SQL_SS_TIMESTAMPOFFSET;
		buffer = _storage->timestampoffsetvec_ptr->data();
		// TODO: Determine proper precision and size based on version of server we're talking to
		param_size = sql_server_2008_default_datetime_precision;
		if (digits <= 0) digits = sql_server_2008_default_datetime_scale;
	}

	void BoundDatum::bind_time_stamp_offset_array(const Local<Value>& p)
	{
		const auto arr = Local<Array>::Cast(p);
		const auto len = arr->Length();
		reserve_time_stamp_offset(len);
		auto& vec = *_storage->timestampoffsetvec_ptr;
		buffer_len = sizeof(SQL_SS_TIMESTAMPOFFSET_STRUCT);
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		for (uint32_t i = 0; i < len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
			const auto elem = MutateJS::get_array_elelemt_at_index(arr, i);
			if (!elem->IsNull())
			{
				_indvec[i] = sizeof(SQL_SS_TIMESTAMPOFFSET_STRUCT);
				const auto d = Local<Date>::Cast<Value>(elem);
				auto& ts = vec[i];
				const auto maybe = d->ToNumber(context);
				Local<Number> local;
				if (maybe.ToLocal(&local)) {
					TimestampColumn sql_date(-1, local->Value());
					sql_date.to_timestamp_offset(ts);
				}
			}
		}
	}

	void BoundDatum::bind_integer(const Local<Value>& p)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		reserve_integer(1);
		auto& vec = *_storage->int64vec_ptr;
		_indvec[0] = SQL_NULL_DATA;
		if (!p->IsNull())
		{
			const auto maybe = p->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				vec[0] = static_cast<long long>(local->Value());
				_indvec[0] = 0;
			}
		}
	}

	void BoundDatum::reserve_integer(const SQLLEN len)
	{
		const auto size = sizeof(int64_t);
		_storage->ReserveInt64(len);
		_indvec.resize(len);
		js_type = JS_NUMBER;
		c_type = SQL_C_SBIGINT;
		sql_type = SQL_BIGINT;
		buffer = _storage->int64vec_ptr->data();
		buffer_len = size * len;
		param_size = size;
		digits = 0;
	}

	void BoundDatum::bind_integer_array(const Local<Value>& p)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto arr = Local<Array>::Cast(p);
		const auto len = arr->Length();
		reserve_integer(len);
		auto& vec = *_storage->int64vec_ptr;
		for (uint32_t i = 0; i < len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
			const auto elem = MutateJS::get_array_elelemt_at_index(arr, i);
			if (!elem->IsNull())
			{
				_indvec[i] = 0;
				const auto maybe = elem->ToBigInt(context);
				Local<BigInt> local;
				if (maybe.ToLocal(&local)) {
					vec[i] = local->Int64Value();
				}
			}
		}
	}

	void BoundDatum::bind_float(const Local<Value>& p)
	{
		bind_double(p);
		sql_type = SQL_FLOAT;
	}

	void BoundDatum::bind_real(const Local<Value>& p)
	{
		bind_double(p);
		sql_type = SQL_REAL;
	}

	void BoundDatum::bind_double(const Local<Value>& p)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		reserve_double(1);
		auto& vec = *_storage->doublevec_ptr;
		_indvec[0] = SQL_NULL_DATA;
		if (!p->IsNull())
		{
			const auto maybe = p->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				vec[0] = local->Value();
				_indvec[0] = 0;
			}
		}
	}

	void BoundDatum::reserve_double(const SQLLEN len)
	{
		const auto size = sizeof(double);
		_storage->ReserveDouble(len);
		_indvec.resize(len);
		js_type = JS_NUMBER;
		c_type = SQL_C_DOUBLE;
		sql_type = SQL_DOUBLE;
		buffer = _storage->doublevec_ptr->data();
		buffer_len = size * len;
		param_size = size;
		digits = 0;
	}

	void BoundDatum::bind_double_array(const Local<Value>& p)
	{
		const auto arr = Local<Array>::Cast(p);
		const auto len = arr->Length();
		reserve_double(len);
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		auto& vec = *_storage->doublevec_ptr;
		for (uint32_t i = 0; i < len; ++i)
		{
			_indvec[i] = SQL_NULL_DATA;
			const auto maybe_elem = arr->Get(context, i);
			Local<Value> elem;
			if (maybe_elem.ToLocal(&elem)) {
				if (!elem->IsNull())
				{
					auto maybe_number = elem->ToNumber(context);
					Local<Number> local_number;
					if (maybe_number.ToLocal(&local_number)) {
						vec[i] = local_number->Value();
						_indvec[i] = 0;
					}
				}
			}
		}
	}

	void BoundDatum::bind_number(const Local<Value>& p)
	{
		// numbers can be either integers or doubles.  We attempt to determine which it is through a simple
		// cast and equality check
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe = p->ToNumber(context);
		Local<Number> local;
		if (maybe.ToLocal(&local)) {
			const auto d = static_cast<long double>(local->Value());
			if (d == floor(d) &&
				d >= static_cast<long double>(numeric_limits<int64_t>::min()) &&
				d <= static_cast<long double>(numeric_limits<int64_t>::max()))
			{
				bind_integer(p);
			}
			else
			{
				bind_double(p);
			}
		}
	}

	void BoundDatum::bind_number_array(const Local<Value>& pp)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto arr = Local<Array>::Cast(pp);
		const auto maybe_elem = arr->Get(context, 0);
		Local<Value> p;
		if (maybe_elem.ToLocal(&p)) {
			const auto maybe = p->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				const auto d = static_cast<long double>(local->Value());
				if (d == floor(d) &&
					d >= static_cast<long double>(numeric_limits<int64_t>::min()) &&
					d <= static_cast<long double>(numeric_limits<int64_t>::max()))
				{
					bind_integer_array(pp);
				}
				else
				{
					bind_double_array(pp);
				}
			}
		}
	}

	bool BoundDatum::bind(const Local<Object> o, const char* if_str, const uint16_t type)
	{
		auto val = MutateJS::get_property_as_value(o, if_str);
		if (!val->IsUndefined())
		{
			param_type = type;
			return bind_datum_type(val);
		}
		return false;
	}

	bool is_numeric(wstring& v)
	{
		const auto res = v == L"numeric"
			|| v == L"decimal"
			|| v == L"smallmoney"
			|| v == L"money"
			|| v == L"float"
			|| v == L"real";
		return res;
	}

	bool is_int(const wstring& v)
	{
		const auto res = v == L"smallint"
			|| v == L"int"
			|| v == L"bigint"
			|| v == L"tinyint";
		return res;
	}

	bool is_string(const wstring& v)
	{
		const auto res = v == L"char"
			|| v == L"text"
			|| v == L"varchar";
		return res;
	}

	bool is_binary(const wstring& v)
	{
		const auto res = v == L"binary";
		return res;
	}

	bool is_bit(const wstring& v)
	{
		const auto res = v == L"bit";
		return res;
	}

	bool is_date(const wstring& v)
	{
		const auto res = v == L"date"
			|| v == L"datetimeoffset"
			|| v == L"datetime2"
			|| v == L"smalldatetime"
			|| v == L"datetime"
			|| v == L"time";
		return res;
	}


	bool sql_type_s_maps_to_numeric(const Local<Value> p)
	{
		const auto str = get_as_string(p, "type_id");
		auto v = FromV8String(str);
		const auto res = is_numeric(v);
		return res;
	}

	bool sql_type_s_maps_to_u_int32(const Local<Value> p)
	{
		const auto str = get_as_string(p, "type_id");
		const auto v = FromV8String(str);
		const auto res = v == L"sbigint";
		return res;
	}

	bool sql_type_s_maps_to_int32(const Local<Value> p)
	{
		const auto str = get_as_string(p, "type_id");
		const auto v = FromV8String(str);
		const auto res = is_int(v);
		return res;
	}

	bool sql_type_s_maps_to_string(const Local<Value> p)
	{
		const auto str = get_as_string(p, "type_id");
		const auto v = FromV8String(str);
		const auto res = is_string(v);
		return res;
	}

	bool sql_type_s_maps_to_boolean(const Local<Value> p)
	{
		const auto str = get_as_string(p, "type_id");
		const auto v = FromV8String(str);
		const auto res = is_bit(v);
		return res;
	}

	bool sql_type_s_maps_to_date(const Local<Value> p)
	{
		const auto str = get_as_string(p, "type_id");
		const auto v = FromV8String(str);
		const auto res = is_date(v);
		return res;
	}

	bool BoundDatum::bind_datum_type(Local<Value>& p)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		if (p->IsNull())
		{
			bind_null(p);
		}
		else if (p->IsString())
		{
			bind_w_var_char(p);
		}
		else if (p->IsBoolean())
		{
			bind_boolean(p);
		}
		else if (p->IsInt32())
		{
			bind_int32(p);
		}
		else if (p->IsUint32())
		{
			bind_uint32(p);
		}
		else if (p->IsNumber())
		{
			const auto maybe = p->ToNumber(context);
			Local<Number> local;
			if (maybe.ToLocal(&local)) {
				const auto d = local->Value();
				if (_isnan(d) || !_finite(d))
				{
					err = static_cast<char*>("Invalid number parameter");
					return false;
				}
				bind_number(p);
			}
		}
		else if (p->IsDate())
		{
			bind_time_stamp_offset(p);
		}
		else if (p->IsObject() && node::Buffer::HasInstance(p))
		{
			bind_var_binary(p);
		}
		else if (sql_type_s_maps_to_tvp(p))
		{
			bind_tvp(p);
		}
		else
		{
			err = static_cast<char*>("Invalid parameter type");
			return false;
		}

		return true;
	}

	Local<Value> reserve_output_param(const Local<Value> p, const int size)
	{
		Local<Value> pval;
		const nodeTypeFactory fact;

		if (sql_type_s_maps_to_int32(p))
		{
			pval = fact.new_int32(0);
		}
		else if (sql_type_s_maps_to_u_int32(p))
		{
			pval = fact.new_uint32(0);
		}
		else if (sql_type_s_maps_to_boolean(p))
		{
			pval = fact.new_int32(0);
		}
		else if (sql_type_s_maps_to_numeric(p))
		{
			pval = fact.new_number(0.0);
		}
		else if (sql_type_s_maps_to_date(p))
		{
			pval = fact.new_date();
		}
		else if (sql_type_s_maps_to_string(p))
		{
			vector<char> b;
			b.resize(static_cast<size_t>(size) + 1);
			pval = fact.new_string(b.data(), size + 1);
		}
		else
		{
			pval = fact.new_buffer(size);
		}
		return pval;
	}

	bool BoundDatum::proc_bind(Local<Value>& p, Local<Value>& v)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe_is_output = v->ToInteger(context);
		Local<Integer> is_output;
		if (!maybe_is_output.ToLocal(&is_output))
		{
			return false;
		}

		Local<Value> pval;
		const auto maybe_object = p->ToObject(context);
		Local<Object> local_object;
		if (!maybe_object.ToLocal(&local_object))
		{
			return false;
		}
		const auto maybe_size = MutateJS::get_property_as_value(local_object, "max_length")->Int32Value(context);
		int size;
		if (!maybe_size.To(&size))
		{
			return false;
		}

		int is_output_i;
		if (!is_output->Int32Value(context).To(&is_output_i))
		{
			return false;
		}
		if (is_output_i != 0)
		{
			param_type = SQL_PARAM_OUTPUT;
			pval = reserve_output_param(p, size);
		}
		else
		{
			param_type = SQL_PARAM_INPUT;
			Local<Object> as_object;
			if (!p->ToObject(context).ToLocal(&as_object))
			{
				return false;
			}
			pval = MutateJS::get_property_as_value(as_object, "val");
		}

		return bind_datum_type(pval);
	}

	void BoundDatum::assign_precision(Local<Object>& pv)
	{
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto precision = MutateJS::get_property_as_value(pv, "precision");
		if (!precision->IsUndefined())
		{
			const auto maybe_param_size = precision->Int32Value(context);
			param_size = maybe_param_size.FromMaybe(0);
		}

		const auto scale = MutateJS::get_property_as_value(pv, "scale");
		if (!scale->IsUndefined())
		{
			const auto maybe_digits = scale->Int32Value(context);
			digits = maybe_digits.FromMaybe(0);
		}

		const auto off = MutateJS::get_property_as_value(pv, "offset");
		if (!off->IsUndefined())
		{
			const auto maybe_offset = off->Int32Value(context);
			offset = maybe_offset.FromMaybe(0);
		}
	}

	void BoundDatum::sql_longvarbinary(Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_var_binary_array(pp);
		}
		else
		{
			bind_long_var_binary(pp);
		}
	}

	void BoundDatum::sql_integer(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_int32_array(pp);
		}
		else
		{
			bind_int32(pp);
		}
	}

	void BoundDatum::sql_wvarchar(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_w_var_char_array(pp);
		}
		else
		{
			bind_w_var_char(pp);
		}
	}

	void BoundDatum::sql_wlongvarchar(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_w_var_char_array(pp);
		}
		else
		{
			bind_w_long_var_char(pp);
		}
	}

	void BoundDatum::sql_bit(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_boolean_array(pp);
		}
		else
		{
			bind_boolean(pp);
		}
	}

	void BoundDatum::sql_bigint(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_integer_array(pp);
		}
		else
		{
			bind_integer(pp);
		}
	}

	void BoundDatum::sql_double(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_double_array(pp);
		}
		else
		{
			bind_double(pp);
		}
	}

	void BoundDatum::sql_float(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_double_array(pp);
			sql_type = SQL_FLOAT;
		}
		else
		{
			bind_float(pp);
		}
	}

	void BoundDatum::sql_real(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_double_array(pp);
			sql_type = SQL_REAL;
		}
		else
		{
			bind_real(pp);
		}
	}

	void BoundDatum::sql_tinyint(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_int32_array(pp);
			sql_type = SQL_TINYINT;
		}
		else
		{
			bind_tiny_int(pp);
		}
	}

	void BoundDatum::sql_smallint(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_uint32_array(pp);
			sql_type = SQL_SMALLINT;
		}
		else
		{
			bind_small_int(pp);
		}
	}

	void BoundDatum::sql_numeric(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_numeric_array(pp);
		}
		else
		{
			bind_numeric(pp);
		}
	}

	void BoundDatum::sql_char(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_w_var_char_array(pp);
		}
		else
		{
			bind_char(pp);
		}
	}

	void BoundDatum::sql_varchar(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_w_var_char_array(pp);
		}
		else
		{
			bind_var_char(pp);
		}
	}

	void BoundDatum::sql_ss_time2(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_time_stamp_offset_array(pp);
		}
		else
		{
			bind_time(pp);
		}
	}

	void BoundDatum::sql_type_date(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_time_stamp_offset_array(pp);
		}
		else
		{
			bind_date(pp);
		}
	}

	void BoundDatum::sql_type_timestamp(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_time_stamp_offset_array(pp);
		}
		else
		{
			bind_time_stamp(pp);
		}
	}

	void BoundDatum::sql_ss_timestampoffset(const Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_time_stamp_offset_array(pp);
		}
		else
		{
			bind_time_stamp_offset(pp);
		}
	}

	void BoundDatum::sql_varbinary(Local<Value> pp)
	{
		if (pp->IsArray())
		{
			bind_var_binary_array(pp);
		}
		else
		{
			if (pp->IsNull()
				|| (pp->IsObject() && node::Buffer::HasInstance(pp)))
			{
				bind_var_binary(pp);
			}
			else
			{
				err = static_cast<char*>("Invalid parameter type");
			}
		}
	}

	bool BoundDatum::user_bind(Local<Value>& p, Local<Value>& v)
	{
		nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe_sql_type = v->Int32Value(fact.isolate->GetCurrentContext());
		const auto local_sql_type = maybe_sql_type.FromMaybe(0);
		if (local_sql_type == 0) return false;
		sql_type = local_sql_type;
		param_type = SQL_PARAM_INPUT;

		const auto maybe_local = p->ToObject(context);
		Local<Object> as_local;
		if (!maybe_local.ToLocal(&as_local))
		{
			return false;
		}

		const auto pp = MutateJS::get_property_as_value(as_local, "value");

		assign_precision(as_local);

		switch (sql_type)
		{
		case SQL_LONGVARBINARY:
			sql_longvarbinary(pp);
			break;

		case SQL_VARBINARY:
		{
			sql_varbinary(pp);
			if (err) return false;
		}
		break;

		case SQL_INTEGER:
			sql_integer(pp);
			break;

		case SQL_WVARCHAR:
			sql_wvarchar(pp);
			break;

		case SQL_WLONGVARCHAR:
			sql_wlongvarchar(pp);
			break;

		case SQL_BIT:
			sql_bit(pp);
			break;

		case SQL_BIGINT:
			sql_bigint(pp);
			break;

		case SQL_DOUBLE:
			sql_double(pp);
			break;

		case SQL_FLOAT:
			sql_float(pp);
			break;

		case SQL_REAL:
			sql_real(pp);
			break;

		case SQL_TINYINT:
			sql_tinyint(pp);
			break;

		case SQL_SMALLINT:
			sql_smallint(pp);
			break;

		case SQL_NUMERIC:
			sql_numeric(pp);
			break;

		case SQL_CHAR:
			sql_char(pp);
			break;

		case SQL_VARCHAR:
			sql_varchar(pp);
			break;

		case SQL_SS_TIME2:
			sql_ss_time2(pp);
			break;

		case SQL_TYPE_DATE:
			sql_type_date(pp);
			break;

		case SQL_TYPE_TIMESTAMP:
			sql_type_timestamp(pp);
			break;

		case SQL_SS_TIMESTAMPOFFSET:
			sql_ss_timestampoffset(pp);
			break;

		case SQL_UNKNOWN_TYPE:
		default:
			return false;
		}

		return true;
	}

	bool BoundDatum::bind_object(Local<Value>& p)
	{
		// fprintf(stderr, "bind obj\n");
		const nodeTypeFactory fact;
		const auto context = fact.isolate->GetCurrentContext();
		const auto maybe_object = p->ToObject(context);
		Local<Object> po;
		if (!maybe_object.ToLocal(&po))
		{
			return false;
		}

		auto v = MutateJS::get_property_as_value(po, "is_output");
		if (!v->IsUndefined())
		{
			return proc_bind(p, v);
		}

		v = MutateJS::get_property_as_value(po, "sql_type");
		if (!v->IsUndefined())
		{
			return user_bind(p, v);
		}

		const auto n = get_as_string(p, "name");
		if (!n->IsUndefined())
		{
			name = wide_from_js_string(n);
			auto pp = MutateJS::get_property_as_value(po, "value");
			return bind_datum_type(pp);
		}
		
		return false;
	}

	bool BoundDatum::bind_array(Local<Value>& pp)
	{
		const auto arr = Local<Array>::Cast(pp);
		nodeTypeCounter counts;

		for (uint32_t i = 0; i < arr->Length(); ++i)
		{
			const auto p = MutateJS::get_array_elelemt_at_index(arr, i);
			counts.Decode(p);
		}

		if (counts.boolCount != 0)
		{
			bind_boolean_array(pp);
		}
		else if (counts.stringCount != 0)
		{
			bind_w_var_char_array(pp);
		}
		else if (counts.dateCount != 0)
		{
			bind_time_stamp_offset_array(pp);
		}
		else if (counts.bufferCount != 0)
		{
			bind_var_binary_array(pp);
		}
		else if (counts.getoutBoundsCount() > 0)
		{
			err = static_cast<char*>("Invalid number parameter");
			return false;
		}
		else if (counts.numberCount > 0)
		{
			bind_double_array(pp);
		}
		else if (counts.int64Count > 0)
		{
			bind_integer_array(pp);
		}
		else if (counts.int32Count != 0)
		{
			bind_int32_array(pp);
		}
		else if (counts.uint32Count != 0)
		{
			bind_uint32_array(pp);
		}
		else if (counts.nullCount == static_cast<int>(arr->Length()))
		{
			bind_null_array(pp);
		}
		else
		{
			err = static_cast<char*>("Invalid parameter type");
			return false;
		}

		return true;
	}

	Local<Value> BoundDatum::unbind_null()
	{
		const nodeTypeFactory fact;
		return fact.null();
	}

	Local<Value> BoundDatum::unbind_string() const
	{
		const auto s = MutateJS::from_two_byte(_storage->uint16vec_ptr->data());
		return s;
	}

	Local<Value> BoundDatum::unbind_double() const
	{
		const nodeTypeFactory fact;
		const auto& vec = *_storage->doublevec_ptr;
		const auto s = fact.new_number(vec[0]);
		return s;
	}

	Local<Value> BoundDatum::unbind_boolean() const
	{
		const nodeTypeFactory fact;
		const auto& vec = *_storage->uint16vec_ptr;
		const auto s = fact.new_boolean(vec[0]);
		return s;
	}

	Local<Value> BoundDatum::unbind_int32() const
	{
		const nodeTypeFactory fact;
		const auto& vec = *_storage->int32vec_ptr;
		const auto s = fact.new_int32(vec[0]);
		return s;
	}

	Local<Value> BoundDatum::unbind_uint32() const
	{
		const nodeTypeFactory fact;
		const auto& vec = *_storage->uint32vec_ptr;
		const auto s = fact.new_uint32(vec[0]);
		return s;
	}

	Local<Value> BoundDatum::unbind_number() const
	{
		Local<Value> v;
		if (sql_type == SQL_C_DOUBLE)
		{
			v = unbind_double();
		}
		else
		{
			const nodeTypeFactory fact;
			auto& vec = *_storage->int64vec_ptr;
			v = fact.new_int64(vec[0]);
		}
		return v;
	}

	Local<Value> BoundDatum::unbind_date() const
	{
		const auto& vec = *_storage->timestampoffsetvec_ptr;
		TimestampColumn tsc(-1, vec[0]);
		return tsc.ToValue();
	}

	void BoundDatum::reserve_column_type(const SQLSMALLINT type, const size_t len, const size_t row_count)
	{
		switch (type)
		{
		case SQL_SS_VARIANT:
			reserve_w_var_char_array(len, row_count);
			break;

		case SQL_CHAR:
		case SQL_VARCHAR:
		case SQL_LONGVARCHAR:
		case SQL_WCHAR:
		case SQL_WVARCHAR:
		case SQL_WLONGVARCHAR:
		case SQL_SS_XML:
		case SQL_GUID:
			reserve_w_var_char_array(len + 1, row_count);
			break;

		case SQL_BIT:
			reserve_boolean(row_count);
			break;

		case SQL_SMALLINT:
		case SQL_TINYINT:
		case SQL_INTEGER:
		case SQL_C_SLONG:
		case SQL_C_SSHORT:
		case SQL_C_STINYINT:
		case SQL_C_ULONG:
		case SQL_C_USHORT:
		case SQL_C_UTINYINT:
		case SQL_BIGINT:
			reserve_integer(row_count);
			break;

		case SQL_DECIMAL:
		case SQL_NUMERIC:
		case SQL_REAL:
		case SQL_FLOAT:
		case SQL_DOUBLE:
			reserve_double(row_count);
			break;

		case SQL_BINARY:
		case SQL_VARBINARY:
		case SQL_LONGVARBINARY:
		case SQL_SS_UDT:
			reserve_var_binary_array(len, row_count);
			break;

		case SQL_SS_TIMESTAMPOFFSET:
			reserve_time_stamp_offset(row_count);
			break;

		case SQL_TYPE_TIME:
		case SQL_SS_TIME2:
			reserve_time(row_count);
			break;

		case SQL_TIMESTAMP:
		case SQL_DATETIME:
		case SQL_TYPE_TIMESTAMP:
		case SQL_TYPE_DATE:
			reserve_time_stamp(row_count);
			break;

		default:
			reserve_w_var_char_array(len, row_count);
			break;
		}
	}

	Local<Value> BoundDatum::unbind() const
	{
		Local<Value> v;

		switch (js_type)
		{
		case JS_STRING:
			v = unbind_string();
			break;

		case JS_BOOLEAN:
			v = unbind_boolean();
			break;

		case JS_INT:
			v = unbind_int32();
			break;

		case JS_UINT:
			v = unbind_uint32();
			break;

		case JS_DATE:
			v = unbind_double();
			break;

		case JS_NUMBER:
			v = unbind_number();
			break;

		default:
			v = unbind_null();
			break;
		}

		return v;
	}
}
