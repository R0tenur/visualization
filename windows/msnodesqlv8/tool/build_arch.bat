set path=%path%;%~dp0
set cmd=%1
set arch=%2

FOR /F "delims=" %%i IN ('node -v') DO set node_ver=%%i
echo "node %node_ver%"

if "%cmd%"=="" (
    set cmd="node"
)

if "%arch%"=="" (
    set arch="x64"
)

echo %cmd%
echo %arch%

if "%cmd%"=="node" (
    call node-gyp clean configure build --verbose --arch=%arch%
    copy build\Release\sqlserverv8.node lib\bin\sqlserverv8.node.%node_ver%.%arch%.node
) else (
        if "%cmd%"=="electron" (
        FOR /F "delims=" %%i IN ('node_modules\.bin\electron.cmd --version') DO set electron_ver=%%i
        echo "electron %electron_ver%"
        call node-gyp clean configure rebuild --target=%electron_ver% --dist-url=https://atom.io/download/atom-shell --verbose --arch=%arch%
        copy build\Release\sqlserverv8.node lib\bin\sqlserverv8.node.%node_ver%.electron.%electron_ver%.%arch%.node
    )
)
