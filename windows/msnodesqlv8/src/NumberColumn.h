#pragma once

#include <v8.h>
#include <Column.h>
#include <BoundDatumHelper.h>

namespace mssql
{
    using namespace std;

    class NumberColumn : public Column
    {
    public:

		NumberColumn(int id, double d) : Column(id), value(d)
		{
		}

		NumberColumn(int id, shared_ptr<DatumStorage> storage) : Column(id), value((*storage->doublevec_ptr)[0])
		{			
		}

	   Local<Value> ToValue() override
	   {
		  nodeTypeFactory fact;
		  auto o = fact.new_number(value);
		  return o;
	   }

    private:
	   double value;
    };
}
