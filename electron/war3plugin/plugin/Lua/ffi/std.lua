local ffi = require 'ffi'
ffi.cdef[[
    //std 相关API声明
    int SetConsoleTextAttribute(int hConsole, int wAttributes);
    int GetStdHandle(int nStdHandle);
    int AllocConsole();
    int FreeConsole();
    int AttachConsole(unsigned int hWnd);
    int SetConsoleIcon(int hIcon);
    int WriteConsoleA(int hConsoleOutput, const char* lpBuffer, unsigned int nNumberOfCharsToWrite, unsigned int* lpNumberOfCharsWritten, void* lpReserved);
    int SetConsoleTitleA(const char* lpConsoleTitle);
]]
local FOREGROUND_BLUE =  0x0001
local FOREGROUND_GREEN = 0x0002
local FOREGROUND_RED =  0x0004
local FOREGROUND_INTENSITY = 0x0008

local STD_OUTPUT_HANDLE = -11
local STD_INPUT_HANDLE = -10
local STD_ERROR_HANDLE = -12

local SetConsoleTextAttribute = ffi.C.SetConsoleTextAttribute
local GetStdHandle = ffi.C.GetStdHandle
local WriteConsoleA = ffi.C.WriteConsoleA
local SetConsoleTitleA = ffi.C.SetConsoleTitleA
local SetConsoleIcon = ffi.C.SetConsoleIcon

local function setColor(hConsole, color)
    SetConsoleTextAttribute(hConsole, color)
end

---@param STD_TYPE int 常量: STD_ 开头
local function getConsole( STD_TYPE )
    return GetStdHandle(STD_TYPE)
end

local table_concat = table.concat

local function write( hConsole , ... )
    local str = table_concat {...}
    WriteConsoleA( hConsole, str, #str, nil, nil )
end

local function setTitle( str )
    SetConsoleTitleA( str )
end

--不可用
local function setIcon_hIcon( hIcon )
    SetConsoleIcon( hIcon )
end

return
{
    FOREGROUND_BLUE = FOREGROUND_BLUE,
    FOREGROUND_GREEN = FOREGROUND_GREEN,
    FOREGROUND_RED = FOREGROUND_RED,
    --加亮 (单独使用时等效于 为黑色0加亮 == 灰色)
    FOREGROUND_INTENSITY = FOREGROUND_INTENSITY,
    --默认色(白色)
    FOREGROUND_DEFAULT = FOREGROUND_BLUE + FOREGROUND_GREEN + FOREGROUND_RED,
    --白色 加亮
    FOREGROUND_DEFAULT_INTENSITY = FOREGROUND_BLUE + FOREGROUND_GREEN + FOREGROUND_RED + FOREGROUND_INTENSITY,

    STD_OUTPUT_HANDLE = STD_OUTPUT_HANDLE,
    STD_INPUT_HANDLE = STD_INPUT_HANDLE,
    STD_ERROR_HANDLE = STD_ERROR_HANDLE,

    setColor = setColor,
    getConsole = getConsole,
    write = write,
    setTitle = setTitle,
    setIcon_hIcon = setIcon_hIcon,

    AllocConsole = ffi.C.AllocConsole,
    FreeConsole = ffi.C.FreeConsole,

    -- 颜色
    -- https://docs.microsoft.com/en-us/windows/console/text-attributes

}