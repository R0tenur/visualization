#pragma once

#include <v8.h>
#include "Column.h"
#include "BoundDatumHelper.h"

namespace mssql
{
    using namespace std;

    class IntColumn : public Column
    {
    public:
	   IntColumn(int id,shared_ptr<DatumStorage> storage) : Column(id), value((*storage->int64vec_ptr)[0])
	   {		   
	   }

	   IntColumn(int id, long v) : Column(id), value(v)
	   {
	   }

	   Local<Value> ToValue() override
	   {
		  nodeTypeFactory fact;
		  auto v = fact.new_long(value);
		  return v;
	   }

    private:
	   int64_t value;
    };
}
