#pragma once

#include <vector>
#include <BoundDatum.h>

namespace mssql
{
	class ResultSet;

	class BoundDatumSet
	{
	public:	
		typedef vector<shared_ptr<BoundDatum>> param_bindings;
		BoundDatumSet();
		bool reserve(const shared_ptr<ResultSet> &set, size_t row_count) const;
		bool bind(Local<Array> &node_params);
		Local<Array> unbind();	
		void clear() { _bindings->clear(); }
		size_t size() { return _bindings->size(); }
		shared_ptr<BoundDatum> & atIndex(int i) { return (*_bindings)[i]; }
		param_bindings::iterator begin() { return _bindings->begin(); }
		param_bindings::iterator end() { return _bindings->end(); }

		char * err;
		int first_error;

	private:
		bool tvp(Local<Value> &v) const;
		int _output_param_count;
		shared_ptr<param_bindings> _bindings;
	};
}
