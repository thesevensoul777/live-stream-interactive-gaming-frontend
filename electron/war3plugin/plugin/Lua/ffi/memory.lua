local ffi = require 'ffi'

ffi.cdef[[
    //VirtualProtect
    BOOL VirtualProtect(
        LPVOID lpAddress,
        SIZE_T dwSize,
        DWORD flNewProtect,
        PDWORD lpflOldProtect
    );
    int VirtualAlloc(
        void* lpAddress,
        unsigned int dwSize,
        unsigned int flAllocationType,
        unsigned int flProtect
    );
    //VirtualFree
    int VirtualFree(
        void* lpAddress,
        unsigned int dwSize,
        unsigned int dwFreeType
    );
    //ReadProcessMemory
    BOOL ReadProcessMemory(
        HANDLE hProcess,
        LPCVOID lpBaseAddress,
        LPVOID lpBuffer,
        SIZE_T nSize,
        SIZE_T *lpNumberOfBytesRead
    );
    //WriteProcessMemory
    BOOL WriteProcessMemory(
        HANDLE hProcess,
        LPVOID lpBaseAddress,
        LPCVOID lpBuffer,
        SIZE_T nSize,
        SIZE_T *lpNumberOfBytesWritten
    );
    //GetCurrentProcess
    HANDLE GetCurrentProcess();
    int malloc(size_t size);
    void free(int ptr);
    void memcpy(int dest, int src, int size);
    void memset(int dest, int c, int size);
]]
---@class Memory
local mt = {}

---@param hProcess int HANDLE
---@param lpBaseAddress int LPCVOID
---@param lpBuffer int LPVOID
---@param nSize int SIZE_T
---@param lpNumberOfBytesRead int SIZE_T
function mt.ReadProcessMemory(hProcess, lpBaseAddress, lpBuffer, nSize, lpNumberOfBytesRead)
    return ffi.C.ReadProcessMemory(hProcess, lpBaseAddress, lpBuffer, nSize, lpNumberOfBytesRead)
end


---@param lpAddress any LPVOID
---@param dwSize any SIZE_T
---@param flNewProtect any DWORD  PAGE_
---@param lpflOldProtect any PDWORD
function mt.VirtualProtect(lpAddress, dwSize, flNewProtect, lpflOldProtect)
    return ffi.C.VirtualProtect(lpAddress, dwSize, flNewProtect, lpflOldProtect)
end

function mt.WriteProcessMemory( hProcess, lpBaseAddress, lpBuffer, nSize, lpNumberOfBytesWritten )
    return ffi.C.WriteProcessMemory(hProcess, lpBaseAddress, lpBuffer, nSize, lpNumberOfBytesWritten)
end

mt.PAGE_EXECUTE_READWRITE   = 0x40      --允许执行,读写
mt.PAGE_READWRITE           = 0x04      --允许 读写
mt.PAGE_WRITECOPY           = 0x08      --允许写入拷贝
mt.PAGE_EXECUTE_WRITECOPY   = 0x0c      --允许执行,写入拷贝
mt.PAGE_EXECUTE             = 0x10      --只允许执行代码
mt.PAGE_NOACCESS            = 0x01      --禁止一切访问
mt.PAGE_READONLY            = 0x02      --只读
mt.PAGE_EXECUTE_READ        = 0x20      --允许执行,读取
mt.PAGE_GUARD               = 0x100     --在页面上写入一个字节时使应用程序收到一个通知
mt.PAGE_NOCACHE             = 0x200     --停用已提交页面的高速缓存。从内存中读取页面时，不将其缓存到系统高速缓存中


mt.MEM_RELEASE              = 0x8000
--重置指定区域的状态，以便如果页面位于分页文件中，则丢弃这些页面并引入零页。 
--如果页面在内存中并已修改，则会将其标记为“未修改”，因此不会将其写出到分页文件中。 内容 不 归零
mt.MEM_RESET                = 0x80000
mt.MEM_RESERVE              = 0x2000    --保留指定地址空间，不分配物理内存。
mt.MEM_COMMIT               = 0x1000    --为指定的空间提交物理内存
mt.MEM_DECOMMIT             = 0x4000    --释放从lpAddress 开始的一个或多个字节 ，即 lpAddress +dwSize。
mt.MEM_PHYSICAL             = 0x400000  --储备的地址范围，可用于内存地址窗口扩展（AWE）的页面。此值必须使用MEM_RESERVE，并没有其他值。
mt.MEM_TOP_DOWN             = 0x100000  --在尽可能高的地址分配内存。这可以比普通的分配速度较慢，尤其是当需要许多分配。
--导致系统来跟踪分配的地区，都写在页面 。
--如果指定此值，则还必须指定MEM_RESERVE。
--要检索的页面是否写入，因为该地区被分配或写跟踪状态被重置地址，调用GetWriteWatch功能。要重置写跟踪状态，调用GetWriteWatch或ResetWriteWatch。
--写跟踪功能仍然启用，直到该地区被释放。
mt.MEM_WRITE_WATCH          = 0x20000
mt.MEM_LARGE_PAGES          = 0x200000  --分配内存使用大页面支持。大小和对齐必须是一个大页面的最低多个 。要获得这个值，使用GetLargePageMinimum。


function mt.read( hProcess, lpAddress, dwSize )
    if hProcess == ffi.NULL then
        hProcess = ffi.C.GetCurrentProcess()
    end
    local buf  = ffi.new("uint8_t[?]", dwSize)
    ffi.fill(buf, dwSize, 0x00)


    local vp_suc = mt.VirtualProtect (lpAddress, dwSize, mt.PAGE_EXECUTE_READWRITE)

    local suc = mt.ReadProcessMemory(hProcess, lpAddress, buf, dwSize, ffi.NULL)
    --log.trace('mem.read addr=', lpAddress, 'suc=', suc, vp_suc)
    return buf
end

function mt.write( hProcess, lpAddress, data, dwSize )
    if hProcess == ffi.NULL then
        hProcess = ffi.C.GetCurrentProcess()
    end
    --dwSize = dwSize and (dwSize > 0 and dwSize or #data) or #data
    local vp_suc = mt.VirtualProtect (lpAddress, dwSize, mt.PAGE_EXECUTE_READWRITE)
    local suc =mt.WriteProcessMemory(hProcess, lpAddress, data, dwSize, ffi.NULL)
    --log.trace('mem.write addr=', lpAddress, 'suc=', suc, vp_suc)
end

return mt