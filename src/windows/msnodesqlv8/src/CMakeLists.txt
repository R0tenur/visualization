cmake_minimum_required(VERSION 3.3)
project(src)

                     # e.g. "date_time" for "libboost_date_time"

set(Boost_USE_STATIC_LIBS        ON) # only find static libs
set(Boost_USE_MULTITHREADED      ON)
set(Boost_USE_STATIC_RUNTIME    OFF)
find_package(Boost COMPONENTS date_time filesystem system)


set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")

set(SOURCE_FILES
    BinaryColumn.h
    BoolColumn.h
    Column.cpp
    Column.h
    Connection.cpp
    Connection.h
    CriticalSection.h
    IntColumn.h
    NodeColumns.h
    NullColumn.h
    NumberColumn.h
    OdbcConnection.cpp
    OdbcConnection.h
    OdbcConnectionBridge.h
    OdbcError.cpp
    OdbcError.h
    OdbcHandle.h
    OdbcOperation.cpp
    OdbcOperation.h
    Operation.h
    ResultSet.cpp
    ResultSet.h
    sqlncli.h
    stdafx.cpp
    stdafx.h
    StringColumn.h
    TimestampColumn.h
    Utility.cpp
    Utility.h)

if(Boost_FOUND)
    include_directories(${Boost_INCLUDE_DIRS})
    add_executable(src ${SOURCE_FILES})
    target_link_libraries(nodelib ${Boost_LIBRARIES})
endif()