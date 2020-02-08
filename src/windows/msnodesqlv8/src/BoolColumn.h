
#pragma once

#include <v8.h>
#include <Column.h>

namespace mssql
{
	using namespace std;

	class BoolColumn : public Column
	{
	public:
		BoolColumn(int id, shared_ptr<DatumStorage> storage) : Column(id), value((*storage->charvec_ptr)[0] != 0 ? true : false)
		{			
		}

		BoolColumn(int id, char v) : Column(id), value(v != 0 ? true : false)
		{
		}

		Local<Value> ToValue() override
		{
			nodeTypeFactory fact;
			auto b = fact.new_boolean(value);
			return b;
		}
	private:
		bool value;
	};
}
