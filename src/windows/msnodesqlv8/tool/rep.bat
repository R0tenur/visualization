set path=%path%;%~dp0
set tst=%1
@echo off

for /L %%n in (1,1,100) do (
    node runtest -t %tst% 2>&1
)