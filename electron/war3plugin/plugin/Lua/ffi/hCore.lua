local ffi = require 'ffi'
---@alias wchar_t wchar_t

---@alias DWORD DWORD unsigned long
---@alias WORD WORD unsigned short
---@alias UINT UINT unsigned int

---@alias LPCWSTR LPCWSTR const wchar_t*

---@alias HWND HWND
---@alias HMENU HMENU
---@alias HINSTANCE HINSTANCE
---@alias LPVOID LPVOID

---@alias LPMSG LPMSG


ffi.cdef[[
    typedef void VOID;
    typedef int BOOL, BOOLEAN;
    typedef short SHORT;
    typedef long LONG;
    typedef int INT;
    typedef unsigned char BYTE;


    typedef unsigned int UINT;
    typedef unsigned int *PUINT;

    typedef int INT_PTR, *PINT_PTR;
    typedef unsigned int UINT_PTR, *PUINT_PTR;

    typedef long LONG_PTR, *PLONG_PTR;
    typedef unsigned long ULONG_PTR, *PULONG_PTR;

    typedef UINT_PTR WPARAM;
    typedef LONG_PTR LPARAM;
    typedef LONG_PTR LRESULT;

    typedef unsigned short WORD;
    typedef unsigned long DWORD;
    typedef unsigned long *PDWORD;
    typedef void *HANDLE, *PVOID, *LPVOID, *PHANDLE;
    typedef const void* LPCVOID;

    typedef unsigned int SIZE_T;

    typedef char CHAR;
    //WCHAR
    typedef wchar_t WCHAR, *PWCHAR, *LPWSTR;

    //LPSTR
    typedef CHAR *PCHAR, *LPSTR;

    //LPCSTR string
    typedef const CHAR *LPCSTR, *PCSTR;
    //LPCWSTR
    typedef const WCHAR *LPCWSTR, *PCWSTR;


    typedef int (__stdcall* FARPROC)();

    
    
    //HMODULE
    typedef HANDLE HMODULE, *PHMODULE, *LPHMODULE;

    typedef struct tagRECT
    {
        LONG    left;
        LONG    top;
        LONG    right;
        LONG    bottom;
    } RECT, *PRECT, *NPRECT, *LPRECT;

    //GetLastError
    DWORD GetLastError();
    int GetModuleHandleA(const char*);
]]

