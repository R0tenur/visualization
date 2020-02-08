set path=%path%;%~dp0
rmdir "C:\Program Files\nodejs"
mklink /D "C:\Program Files\nodejs" "C:\Program Files\nodejs.%1.x64"
node --version
