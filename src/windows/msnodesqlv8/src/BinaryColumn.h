#pragma once

#include <vector>
#include <v8.h>
#include "Column.h"
#include <node_buffer.h>
#include "BoundDatumHelper.h"

namespace mssql
{
    using namespace std;

    class BinaryColumn : public Column
    {
    public:
		BinaryColumn(int id, shared_ptr<DatumStorage> storage, size_t l) : Column(id)
			, len(l), offset(0), raw(clone(storage->charvec_ptr, offset, l))
		{
		}

		BinaryColumn(int id, shared_ptr<DatumStorage> storage, size_t offset, size_t l) : Column(id)
			, len(l), offset(offset), raw(clone(storage->charvec_ptr, offset, l))
		{
		}

	   Local<Value> ToValue() override
	   {
		   return node::Buffer::New(Isolate::GetCurrent(), raw, len, deleteBuffer, raw)
#ifdef NODE_GYP_V4 
			   .ToLocalChecked()
#endif
			   ;
	   }

    private:

		static char *clone(shared_ptr<DatumStorage::char_vec_t> sp, size_t offset, size_t len)
		{
			char *dest = new char[len];
			memcpy(dest, sp->data() + offset, len);
			return dest;
		}

		static void deleteBuffer(char* ptr, void* hint)
		{
			//fprintf(stderr, "delete ptr %p\n", hint);
			delete[] hint;
		}

		size_t len;
		size_t offset;
		char *raw;
    };
}
