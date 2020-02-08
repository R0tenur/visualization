set path=%path%;%~dp0
@echo off
copy bindingdotgyp.old binding.gyp
call npm install -g node-gyp
call build_arch.bat node ia32
call build_arch.bat node x64
rem call build-typescript-samples.bat
