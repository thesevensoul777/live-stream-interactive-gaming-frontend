local ffi = require 'ffi'

ffi.cdef[[
    int MultiByteToWideChar(unsigned int CodePage, unsigned long dwFlags, const char* lpMultiByteStr, int cbMultiByte, wchar_t* lpWideCharStr, int cchWideChar);
    int WideCharToMultiByte(unsigned int CodePage, unsigned long dwFlags, const wchar_t* lpWideCharStr, int cchWideChar, char* lpMultiByteStr, int cchMultiByte, const char* lpDefaultChar, int* pfUsedDefaultChar);

    //wcslen
    int wcslen(const wchar_t *lpwcs);
    ]]
local MultiByteToWideChar = ffi.C.MultiByteToWideChar
local WideCharToMultiByte = ffi.C.WideCharToMultiByte
local wcslen = ffi.C.wcslen

local ffi_new = ffi.new
local ffi_string = ffi.string

local CP_UTF8 = 65001
local CP_ACP = 0

local function u2w(input)
    local wlen = MultiByteToWideChar(CP_UTF8, 0, input, #input, nil, 0)
    local wstr = ffi_new('wchar_t[?]', wlen+1)
    MultiByteToWideChar(CP_UTF8, 0, input, #input, wstr, wlen)
    return wstr, wlen
end

local function a2w(input)
    local wlen = MultiByteToWideChar(CP_ACP, 0, input, #input, nil, 0)
    local wstr = ffi_new('wchar_t[?]', wlen+1)
    MultiByteToWideChar(CP_ACP, 0, input, #input, wstr, wlen)
    return wstr, wlen
end

local function w2u(wstr, wlen)
    local len = WideCharToMultiByte(CP_UTF8, 0, wstr, wlen, nil, 0, nil, nil)
    local str = ffi_new('char[?]', len+1)
    WideCharToMultiByte(CP_UTF8, 0, wstr, wlen, str, len, nil, nil)
    return ffi_string(str)
end

local function w2a(wstr, wlen)
    local len = WideCharToMultiByte(CP_ACP, 0, wstr, wlen, nil, 0, nil, nil)
    local str = ffi_new('char[?]', len+1)
    WideCharToMultiByte(CP_ACP, 0, wstr, wlen, str, len, nil, nil)
    return ffi_string(str)
end

---@class ffi.unicode
---@field wcslen fun(wstr:LPCWSTR)
local mt = {
    u2w = u2w,
    a2w = a2w,
    w2u = w2u,
    w2a = w2a,
    u2a = function (input)
        return w2a(u2w(input))
    end,
    a2u = function (input)
        return w2u(a2w(input))
    end,
    wcslen = wcslen,
    L = function ( input )
        return ( u2w( input ) )
    end
}


return mt
