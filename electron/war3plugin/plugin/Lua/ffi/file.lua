local ffi = require 'ffi'
local uni = require 'ffi.unicode'
local L = uni.L

local Dbghelp = ffi.load('Dbghelp.dll') --MakeSureDirectoryPathExists

local Shell32 = ffi.load('Shell32.dll') --SHCreateDirectoryEx


ffi.cdef[[
int DeleteFileA( const char* filename );
int DeleteFileW( const wchar_t* filename );

//dbghelp ANSI 支持创建多级目录
int MakeSureDirectoryPathExists( const char* dirPath );

//shell32 ANSI & unicode
int SHCreateDirectoryExA(int hwnd,const char* pszPath, int psa);


]]
local DeleteFileW = ffi.C.DeleteFileW

--psa: SECURITY_ATTRIBUTES
--SHCreateDirectoryEx(NULL,"\\\\192.168.XXX.XXX\\share\\444\\333\\456\\abc.txt", NULL);
return
{
    DeleteFile = function(filename)
        return DeleteFileW( L(filename) )
    end,
    MakeSureDirectoryPathExists = function(dirPath)
        return Dbghelp.MakeSureDirectoryPathExists(dirPath)
    end,
    SHCreateDirectoryEx = function(pszPath)
        return Shell32.SHCreateDirectoryExA(0, pszPath, 0)
    end,

}