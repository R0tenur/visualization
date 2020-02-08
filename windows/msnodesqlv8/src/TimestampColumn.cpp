//---------------------------------------------------------------------------------------------------------------------------------
// File: Column.cpp
// Contents: Column objects from SQL Server to return as Javascript types
// 
// Copyright Microsoft Corporation and contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//
// You may obtain a copy of the License at:
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//---------------------------------------------------------------------------------------------------------------------------------

#include "stdafx.h"
#include <TimestampColumn.h>

namespace mssql {

	namespace {

		const int64_t ms_per_second = static_cast<int64_t>(1e3);
		const int64_t ms_per_minute = 60 * ms_per_second;
		const int64_t ms_per_hour = 60 * ms_per_minute;
		const int64_t ms_per_day = 24 * ms_per_hour;

		bool is_leap_year(const int64_t year)
		{
			return (year % 4 == 0 && (year % 100 != 0) || (year % 400) == 0);
		}
	}

	// return the number of days since Jan 1, 1970
	double TimestampColumn::DaysSinceEpoch(const SQLSMALLINT y, const SQLUSMALLINT m, const SQLUSMALLINT d) const
	{
		// table derived from ECMA 262 15.9.1.4
		static const double days_in_months[] = { 0.0, 31.0, 59.0, 90.0, 120.0, 151.0, 181.0, 212.0, 243.0, 273.0, 304.0, 334.0 };

		// calculate the number of days to the start of the year
		auto days = 365.0 * (y - 1970.0) + floor((y - 1969.0) / 4.0) - floor((y - 1901.0) / 100.0) + floor((y - 1601.0) / 400.0);

		// add in the number of days from the month
		days += days_in_months[m - 1];

		// and finally add in the day from the date to the number of days elapsed
		days += d - 1.0;

		// account for leap year this year (affects days after Feb. 29)
		if (is_leap_year(y) && m > 2) {
			days += 1.0;
		}

		return floor(days);
	}

	void TimestampColumn::milliseconds_from_timestamp(TIMESTAMP_STRUCT const & ts, const int32_t tz_offset)
	{
		const auto tzhrs = tz_offset / 60;
		const auto tzmins = tz_offset % 60;

		SQL_SS_TIMESTAMPOFFSET_STRUCT time_struct;
		time_struct.year = ts.year;
		time_struct.month = ts.month;
		time_struct.day = ts.day;
		time_struct.hour = ts.hour;
		time_struct.minute = ts.minute;
		time_struct.second = ts.second;
		time_struct.fraction = ts.fraction;
		time_struct.timezone_hour = tzhrs;
		time_struct.timezone_minute = tzmins;
		milliseconds_from_timestamp_offset(time_struct);
	}

	// derived from ECMA 262 15.9
	void TimestampColumn::milliseconds_from_timestamp_offset(SQL_SS_TIMESTAMPOFFSET_STRUCT const& timeStruct)
	{
		auto ms = DaysSinceEpoch(timeStruct.year, timeStruct.month, timeStruct.day);
		ms *= ms_per_day;

		// add in the hour, day minute, second and millisecond
		ms += timeStruct.hour * ms_per_hour + timeStruct.minute * ms_per_minute + timeStruct.second * ms_per_second;
		ms += static_cast<double>(timeStruct.fraction / NANOSECONDS_PER_MS);    
		// fraction is in nanoseconds
		// handle timezone adjustment to UTC
		ms -= timeStruct.timezone_hour * ms_per_hour;
		ms -= timeStruct.timezone_minute * ms_per_minute;

		milliseconds = ms;

		nanoseconds_delta = timeStruct.fraction % NANOSECONDS_PER_MS;
	}

	int64_t TimestampColumn::year_from_day(int64_t& day)
	{
		int64_t year = 1970;
		int64_t days_in_year = 365;

		if (day >= 0) {
			while (day >= days_in_year) {

				day -= days_in_year;
				++year;
				if (is_leap_year(year)) {
					days_in_year = 366;
				}
				else {
					days_in_year = 365;
				}
			}
		}
		else {

			while (day <= -days_in_year) {

				day += days_in_year;
				--year;
				if (is_leap_year(year - 1)) {
					days_in_year = 366;
				}
				else {
					days_in_year = 365;
				}
			}

			if (day < 0) {
				--year;
				day += days_in_year;
			}
		}

		return year;
	}

	// calculate the individual components of a date from the total milliseconds
	// since Jan 1, 1970.  Dates before 1970 are represented as negative numbers.
	void TimestampColumn::DateFromMilliseconds(SQL_SS_TIMESTAMPOFFSET_STRUCT& date) const
	{
		static const int64_t days_in_months[] = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
		static const int64_t leap_days_in_months[] = { 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };

		auto start_days = days_in_months;

		// calculate the number of days elapsed (normalized from the beginning of supported datetime)
		auto day = static_cast<int64_t>(milliseconds) / ms_per_day;
		// calculate time portion of the timestamp
		auto time = static_cast<int64_t>(milliseconds) % ms_per_day;
		if (time < 0) {
			time = ms_per_day + time;
			--day;
		}

		// how many leap years have passed since that time?
		const auto year = year_from_day(day);

		if (is_leap_year(year)) {
			start_days = leap_days_in_months;
		}


		int64_t month = 0;
		while (day >= start_days[month]) {
			day -= start_days[month];
			++month;
		}
		assert(month >= 0 && month <= 11);
		assert(day >= 0 && day <= 30);

		date.year = static_cast<SQLSMALLINT>(year);
		date.month = static_cast<SQLUSMALLINT>(month + 1);
		date.day = static_cast<SQLUSMALLINT>(day + 1);

		// SQL Server has 100 nanosecond resolution, so we adjust the milliseconds to high bits
		date.hour = static_cast<SQLUSMALLINT>(time / ms_per_hour);
		date.minute = static_cast<SQLUSMALLINT>((time % ms_per_hour) / ms_per_minute);
		date.second = (time % ms_per_minute) / ms_per_second;
		date.fraction = (time % 1000) * NANOSECONDS_PER_MS;
		date.timezone_hour = offset_minutes / 60;
		date.timezone_minute = offset_minutes % 60;
	}

}   // namespace mssql