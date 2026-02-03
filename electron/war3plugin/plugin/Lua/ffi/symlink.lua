local ffi = require 'ffi'
local uni = require 'ffi.unicode'
ffi.cdef[[
int CreateSymbolicLinkA( const char* szTarget, const char* szSource, unsigned int dwFlag);
int CreateSymbolicLinkW( const wchar_t* szTarget, const wchar_t* szSource, unsigned int dwFlag);

int GetFileAttributesA( const char* lpFileName );
int GetFileAttributesW( const wchar_t* lpFileName );

]]
local CreateSymbolicLinkA = ffi.C.CreateSymbolicLinkA
local CreateSymbolicLinkW = ffi.C.CreateSymbolicLinkW
--[[
0x0
链接目标是文件。  

SYMBOLIC_LINK_FLAG_DIRECTORY
0x1     链接目标是目录。

SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE
0x2 
指定此标志以允许在进程未提升时创建符号链接。
在 UWP 中，必须先在计算机上启用 开发人员模式 ，此选项才能正常工作。 在 MSIX 下，无需为此标志启用开发人员模式。
]]

local GetFileAttributesA = ffi.C.GetFileAttributesA
local GetFileAttributesW = ffi.C.GetFileAttributesW

local FILE_ATTRIBUTE_REPARSE_POINT = 1024 --具有关联的重新分析点的文件或目录，或作为符号链接的文件。

local IO_REPARSE_TAG_MOUNT_POINT = 0xA0000003
local IO_REPARSE_TAG_SYMLINK = 0xA000000C

ffi.cdef[[
    typedef struct _FILETIME {
        DWORD dwLowDateTime;
        DWORD dwHighDateTime;
      } FILETIME, *PFILETIME, *LPFILETIME;
      typedef struct _WIN32_FIND_DATAA {
        DWORD    dwFileAttributes;
        FILETIME ftCreationTime;
        FILETIME ftLastAccessTime;
        FILETIME ftLastWriteTime;
        DWORD    nFileSizeHigh;
        DWORD    nFileSizeLow;
        DWORD    dwReserved0;
        DWORD    dwReserved1;
        char     cFileName[260];
        char     cAlternateFileName[14];
        DWORD    dwFileType; // Obsolete. Do not use.
        DWORD    dwCreatorType; // Obsolete. Do not use
        WORD     wFinderFlags; // Obsolete. Do not use
      } WIN32_FIND_DATAA, *PWIN32_FIND_DATAA, *LPWIN32_FIND_DATAA;

      typedef struct _WIN32_FIND_DATAW {
        DWORD    dwFileAttributes;
        FILETIME ftCreationTime;
        FILETIME ftLastAccessTime;
        FILETIME ftLastWriteTime;
        DWORD    nFileSizeHigh;
        DWORD    nFileSizeLow;
        DWORD    dwReserved0;
        DWORD    dwReserved1;
        wchar_t    cFileName[260];
        wchar_t    cAlternateFileName[14];
        DWORD    dwFileType; // Obsolete. Do not use.
        DWORD    dwCreatorType; // Obsolete. Do not use
        WORD     wFinderFlags; // Obsolete. Do not use
      } WIN32_FIND_DATAW, *PWIN32_FIND_DATAW, *LPWIN32_FIND_DATAW;

    //HANDLE 显式转换为 int 方便直接判断
    int FindFirstFileW(
        const wchar_t*        lpFileName,
        LPWIN32_FIND_DATAW lpFindFileData
    );
    int FindClose(
        HANDLE hFindFile
    );
]]
local FindFirstFileW = ffi.C.FindFirstFileW
local FindClose = ffi.C.FindClose

return
{
    create = function (szTarget, szSource)
        szTarget = uni.u2w( szTarget )
        szSource = uni.u2w( szSource )
        return CreateSymbolicLinkW(szTarget, szSource, 2) ~= 0
        --return CreateSymbolicLinkA(szTarget, szSource, 2) ~= 0
    end,
    isSymlink = function (szTarget)
        szTarget = uni.u2w( szTarget )
        local attrib = GetFileAttributesW(szTarget)

        if ((attrib & FILE_ATTRIBUTE_REPARSE_POINT) == 0) then
            return false
        end

        local ffd = ffi.new("WIN32_FIND_DATAW")
        ffi.fill(ffd, ffi.sizeof(ffd), 0x00) -- zero it out

        local hff = FindFirstFileW(szTarget, ffd)

        --#define INVALID_HANDLE_VALUE ((HANDLE)(LONG_PTR)-1)
        --void* 读取则为0xFFFFFFFF
        if hff ~= -1 then
            FindClose(hff)
        end

        return ffd.dwReserved0 == IO_REPARSE_TAG_SYMLINK
    end,
}
