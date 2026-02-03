---@class mInlineHook
local mt = {}
local class = {}
class.__index = class
local ffi = require 'ffi'
local L = require 'ffi.unicode'.L
ffi.cdef[[
    //定义一个函数指针 用于将lua函数转换为c函数
    typedef int(*lua_CFunction_noParams)();
    //GetCurrentProcess
    HANDLE GetCurrentProcess();
    //copymem
    void* __cdecl memcpy(void* dest, const void* src, size_t count);
]]
local mem = require 'ffi.memory'
local xt = require 'xgthunk'

function mt:toCFunction_noParams( lua_function )
    return ffi.cast('lua_CFunction_noParams', lua_function)
end

local function genJmpCode(lpAddress, lpNewAddress)
    --local jmp_dist = ffi.number(lpAddress) - (lpNewAddress + 5)
    local jmp_code = ffi.C.malloc( 8 )
    ffi.C.memset( jmp_code, 0, 8 )

    -- 184,0,0,0,0  mov,eax lpNewAddress
    -- 255,224  jmp eax

    ffi.C.memset( jmp_code, 184, 1)
    xt.writeInt32( jmp_code + 1, lpNewAddress )

    ffi.C.memset( jmp_code + 5, 255, 1 )
    ffi.C.memset( jmp_code + 6, 224, 1 )

    return jmp_code
end

---@return inlinehook
function mt:hook( lpAddress, newAddress )
    mem.VirtualProtect (lpAddress, 8, mem.PAGE_EXECUTE_READWRITE)

    local entry_orig = ffi.C.malloc( 8 )
    ffi.C.memcpy( entry_orig, lpAddress, 8 )

    local jmp_code = genJmpCode(lpAddress, newAddress)

    ffi.C.memcpy( lpAddress, jmp_code, 8 )
    --mem.write(-1, lpAddress, jmp_code, 8 )
    ---@class inlinehook
    return setmetatable( {
        code_orig = entry_orig, --uint8_t[5]
        code_jmp = jmp_code,   --uint8_t[5]

        real = lpAddress, --uint8_t*
        fake = newAddress,
    }, class)

end

ffi.cdef[[
    //LoadLibraryExW
    HMODULE LoadLibraryExW(
        LPCWSTR lpFileName,
        HANDLE hFile,
        DWORD  dwFlags
    );
    //LoadLibraryExA
    HMODULE LoadLibraryExA(
        LPCSTR lpFileName,
        HANDLE hFile,
        DWORD  dwFlags
    );
    //FreeLibrary
    BOOL FreeLibrary(
        HMODULE hLibModule
    );

    FARPROC GetProcAddress(uint32_t hModule, uint32_t ord_or_namePtr);

]]

---@param library_name string user32.dll
---@param function_name string GetWindow
---@return int
function mt:GetAddress( library_name, function_name )
    local hModule = ffi.C.LoadLibraryExA( library_name, 0, 1 )
    if hModule == nil then
        return 0
    end
    ffi.C.FreeLibrary( hModule )

    --log.trace('GetProcAddress', hModule, library_name, function_name)
    local lptr = tonumber(ffi.cast("const char *", function_name))
    local entry = ffi.C.GetProcAddress( ffi.cast('uint32_t',hModule), lptr )
    local lpEntry = ffi.cast( 'int', entry )

    --last error 127 (0x7F) 找不到指定的过程。
    if lpEntry <= 0 then
        return 0
    end
    return tonumber(lpEntry)//1|0
end
local dlls = { "kernel32.dll", "user32.dll", "winmm.dll", "ws2_32.dll", "WinINet.dll", "gdi32.dll", "GLU32.DLL", "aclui.dll", "acsmib.dll", "activeds.dll", "AcXtrnal.dll", "adimage.dll", "adptif.dll", "ADVAPI32.DLL", "advpack.dll", "atl.dll", "authz.dll", "avicap32.dll", "avifil32.dll", "browseui.dll", "CABINET.DLL", "clusapi.dll", "comctl32.dll", "comdlg32.dll", "comsvcs.dll", "crtdll.dll", "crypt32.dll", "cryptnet.dll", "D3DRM.DLL", "dbghelp.dll", "ddraw.dll", "DHCPCSVC.DLL", "digest.dll", "DINPUT.DLL", "dplay.dll", "dplayx.dll", "dsound.dll", "dsprop.dll", "dsuiext.dll", "ftsrch.dll", "gpedit.dll", "hhctrl.ocx", "hlink.dll", "iasperf.dll", "icm32.dll", "ICMP.DLL", "icmui.dll", "idq.dll", "iedkcs32.dll", "iissuba.dll", "IMAGEHLP.DLL", "imm32.dll", "inetcpl.cpl", "IPHLPAPI.DLL", "iprop.dll", "KSUSER.DLL", "loadperf.dll", "lz32.dll", "mapi32.dll", "mgmtapi.dll", "MOBSYNC.DLL", "mpg4dmod.dll", "mpr.dll", "mprapi.dll", "mqrt.dll", "msacm32.dll", "msafd.dll", "mscms.dll", "mscpxl32.dLL", "msgina.dll", "MSHTML.DLL", "MSI.DLL", "msimg32.dll", "msorcl32.dll", "MSPATCHA.DLL", "msrating.dll", "mstlsapi.dll", "msvbvm50.dll", "msvfw32.dll", "MSWSOCK.DLL", "MTXDM.DLL", "MTXOCI.DLL", "NDDEAPI.DLL", "ndisnpp.dll", "netapi32.dll", "npptools.dll", "ntdll.dll", "ntdsapi.dll", "ntdsbcli.dll", "ntmsapi.dll", "nwprovau.dll", "odbc32.dll", "ODBCBCP.DLL", "odbccp32.dll", "ODBCTRAC.DLL", "ole32.dll", "OLEACC.DLL", "oleaut32.dll", "olecli32.dll", "oledlg.dll", "olesvr32.dll", "opengl32.dll", "password.cpl", "pdh.dll", "Powrprof.dll", "psapi.dll", "qosname.dll", "query.dll", "rasapi32.dll", "raschap.dll", "rasdlg.dll", "rasman.dll", "rassapi.dll", "rastls.dll", "resutils.dll", "RICHED20.DLL", "rpcns4.dll", "rpcrt4.dll", "RSRC32.dll", "rtm.dll", "rtutils.dll", "scarddlg.dll", "secur32.dll", "SENSAPI.DLL", "setupapi.dll", "SFC.DLL", "shdocvw.dll", "shell32.dll", "shlwapi.dll", "snmpapi.dll", "softpub.dll", "spoolss.dll", "SVRAPI.DLL", "tapi32.dll", "TLBINF32.dll", "traffic.dll", "url.dll", "URLMON.DLL", "userenv.dll", "USP10.DLL", "uxtheme.dll", "VB5STKIT.DLL", "vba6.dll", "VDMDBG.DLL", "version.dll", "winfax.dll", "wininet.dll", "winscard.dll", "winspool.dll", "winspool.drv", "wintrust.dll", "wldap32.dll", "WOW32.DLL", "wsnmp32.dll", "wtsapi32.dll", "xolehlp.dll" }

function mt:GetSystemProcAddress( name )
    for index, dll in ipairs(dlls) do
        local addr = self:GetAddress( dll, name )

        if addr > 0 then
            return addr
        end
    end
    return 0
end
function class:pause()
    ffi.C.memcpy( self.real, self.code_orig, 8 )
    --mem.write( ffi.NULL, self.real, self.code_orig, 8 )
end

function class:resume()
    ffi.C.memcpy( self.real, self.code_jmp, 8 )
    --mem.write( ffi.NULL, self.real, self.code_jmp, 8 )
end

function class:unhook()
    self:pause()
    mem.write(-1, self.real, self.code_orig, 8 )
    setmetatable(self, nil)
    self.real = nil
    self.code_orig = nil
    self.code_jmp = nil
end










return mt