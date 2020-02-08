set path=%path%;%~dp0
@echo off
call build_arch.bat electron ia32
call build_arch.bat electron x64
