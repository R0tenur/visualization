
#pragma once

#include <memory>
#include <vector>
#include <v8.h>
#include "Column.h"
#include "BoundDatumHelper.h"
#include <MutateJS.h>

namespace mssql
{
    using namespace std;

    class StringColumn : public Column
    {
    public:
	   virtual ~StringColumn()
	   {
	   }

	   StringColumn(int id, shared_ptr<DatumStorage> s, size_t size) : Column(id), size(size), storage(s->uint16vec_ptr)
	   {
	   }

	   StringColumn(int id, shared_ptr<DatumStorage::uint16_t_vec_t> s, size_t size) : Column(id), size(size), storage(s)
	   {
	   }

	   StringColumn(int id, shared_ptr<DatumStorage::uint16_t_vec_t> s, size_t offset, size_t size) : Column(id), offset(offset), size(size), storage(s)
	   {
	   }

	   Local<Value> ToValue() override
	   {
		  auto ptr = storage->data();
		  auto len = size;
		  auto s = MutateJS::from_two_byte(static_cast<const uint16_t*>(ptr + offset), len);
		  return s;
	   }

    private:

		shared_ptr<DatumStorage::uint16_t_vec_t> storage;
		size_t size;
		size_t offset = 0;
    };
}
