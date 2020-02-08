set path=%path%;%~dp0

call nvm use 10.15.3
call build.bat

call nvm use 11.14.0
call build.bat

rem call build-electron.bat
rem call build-electron.bat
