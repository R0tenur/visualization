echo start > ./test.txt
for /L %%n in (1,1,100) do (

rem FOR %%A IN (prepared.js params.js query.js querytimeout.js connect.js bulk.js sproc.js prepared.js userbind.js) DO (
rem         node runtest.js -t %%A >> ./test.txt 2>&1
rem    )

    rem node runtest -t tvp -t warnings.js -t compoundqueries.js -t querycancel.js -t txn.js -t datatypes.js -t params.js -t query.js -t querytimeout.js -t connect.js -t bulk.js -t sproc.js -t prepared.js -t userbind.js -t dates.js 2>&1 >> ./test.txt 2>&1
    node runtest -t params
	echo "next " >> ./test.txt 2>&1
)
