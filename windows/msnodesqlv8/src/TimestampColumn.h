#pragma once

#include <v8.h>
#include <Column.h>
#include <Utility.h>
#include <sql.h>
#include <sqlncli.h>
#include <BoundDatumHelper.h>

namespace mssql
{
	using namespace std;

	// Timestamps return dates in UTC timezone
	class TimestampColumn : public Column
	{
	public:

		TimestampColumn(int id, shared_ptr<DatumStorage> storage, int32_t tz_offset = 0) : Column(id)
		{
			auto & ins = (*storage);
			if (ins.timestampoffsetvec_ptr != nullptr) {
				auto & timeStruct = (*ins.timestampoffsetvec_ptr)[0];
				milliseconds_from_timestamp_offset(timeStruct);
			}
			else if (ins.timestampvec_ptr != nullptr) {
				auto & timeStruct = (*ins.timestampvec_ptr)[0];
				milliseconds_from_timestamp(timeStruct, tz_offset);
			}
		}

		TimestampColumn(int id, SQL_SS_TIMESTAMPOFFSET_STRUCT const& timeStruct) : Column(id)
		{
			milliseconds_from_timestamp_offset(timeStruct);
		}

		TimestampColumn(int id, TIMESTAMP_STRUCT const& timeStruct) : Column(id)
		{
			milliseconds_from_timestamp(timeStruct);
		}

		TimestampColumn(int id, double ms, int32_t delta, int32_t offset) : Column(id),
			milliseconds(ms),
			nanoseconds_delta(delta),
			offset_minutes(offset)
		{
		}

		TimestampColumn(int id, double ms) : TimestampColumn(id, ms, 0, 0)
		{
		}

		Local<Value> ToValue() override
		{
			nodeTypeFactory fact;
			auto dd = fact.new_date(milliseconds, nanoseconds_delta);
			return dd;
		}

		void to_timestamp_offset(SQL_SS_TIMESTAMPOFFSET_STRUCT& date) const
		{
			DateFromMilliseconds(date);
		}

		void to_timestamp_struct(SQL_TIMESTAMP_STRUCT & timestamp) const
		{
			SQL_SS_TIMESTAMPOFFSET_STRUCT ts;
			to_timestamp_offset(ts);
			timestamp.year = ts.year;
			timestamp.month = ts.month;
			timestamp.day = ts.day;
			timestamp.hour = ts.hour;
			timestamp.minute = ts.minute;
			timestamp.second = ts.second;
			timestamp.fraction = ts.fraction;
		}

		void ToTime2Struct(SQL_SS_TIME2_STRUCT & time2) const
		{
			SQL_SS_TIMESTAMPOFFSET_STRUCT ts;
			to_timestamp_offset(ts);
			time2.hour = ts.hour;
			time2.minute = ts.minute;
			time2.second = ts.second;
			time2.fraction = ts.fraction;
		}

		void ToDateStruct(SQL_DATE_STRUCT & dt) const
		{
			SQL_SS_TIMESTAMPOFFSET_STRUCT ts;
			to_timestamp_offset(ts);
			dt.year = ts.year;
			dt.month = ts.month;
			dt.day = ts.day;
		}

		static const int64_t NANOSECONDS_PER_MS = static_cast<int64_t>(1e6);                  // nanoseconds per millisecond

	private:

		double milliseconds;
		int32_t nanoseconds_delta;    // just the fractional part of the time passed in, not since epoch time

									  // return the number of days since Jan 1, 1970
		double DaysSinceEpoch(SQLSMALLINT y, SQLUSMALLINT m, SQLUSMALLINT d) const;

		void milliseconds_from_timestamp(TIMESTAMP_STRUCT const & ts, int tz_offset = 0);

		// derived from ECMA 262 15.9
		void milliseconds_from_timestamp_offset(SQL_SS_TIMESTAMPOFFSET_STRUCT const& timeStruct);

		// return the year from the epoch time.  The remainder is returned in the day parameter
		static int64_t year_from_day(int64_t& day);

		// calculate the individual components of a date from the total milliseconds
		// since Jan 1, 1970
		void DateFromMilliseconds(SQL_SS_TIMESTAMPOFFSET_STRUCT& date) const;

		int32_t offset_minutes;
	};
}
