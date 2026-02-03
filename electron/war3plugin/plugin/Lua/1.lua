local ffi = require "ffi"
require 'ffi.Core'
require 'ffi.window'
local Kernel32 = ffi.load'Kernel32.dll'
ffi.cdef[[
    //typedef LRESULT (__stdcall* WNDPROC)(HWND, UINT, WPARAM, LPARAM);
    //TIMERPROC
    typedef void (__stdcall *TIMERPROC)(
        HWND hwnd, // handle to the window whose timer message is to be cancelled
        UINT_PTR nIDEvent // timer identifier
    );
    //SetTimer
    int SetTimer(
        HWND hwnd, // handle to the window to receive the timer messages
        UINT_PTR nIDEvent, // timer identifier
        UINT uElapse, // interval between timer messages
        TIMERPROC lpTimerFunc // timer callback function
    );
    //KillTimer
    BOOL KillTimer(
        HWND hwnd, // handle to the window whose timer message is to be cancelled
        UINT_PTR nIDEvent // timer identifier
    );

    //NTSTATUS
    typedef long NTSTATUS, *PNTSTATUS;
    //PHANDLE
    typedef void *PHANDLE;
    //PTIMERAPCROUTINE
    typedef void (__stdcall *WaitOrTimerCallback)(PHANDLE lpParameter, BOOLEAN TimerOrWaitFired);
    //LARGE_INTEGER
    typedef struct _LARGE_INTEGER {
        LONG LowPart;
        LONG HighPart;
    } LARGE_INTEGER, *PLARGE_INTEGER;


    //CreateTimerQueueTimer
    NTSTATUS CreateTimerQueueTimer(
        PHANDLE phNewTimer, // timer handle
        HANDLE hTimerQueue, // timer queue handle
        WaitOrTimerCallback pfnCompletionRoutine, // completion routine
        PVOID pvParameter, // completion routine parameter
        DWORD DueTime, // time delay
        DWORD Period, // period
        ULONG_PTR Flags // timer flags
    );
    //DeleteTimerQueueTimer
    NTSTATUS DeleteTimerQueueTimer(
        HANDLE hTimerQueue, // timer queue handle
        HANDLE hTimer, // timer handle
        PVOID pvCompletionEvent // completion event
    );
    HANDLE CreateTimerQueue();
    
]]

local ole32 = ffi.load('Ole32.dll')
ffi.cdef[[
    //coinit
    bool CoInitialize(LPVOID pvReserved);
]]
local callback = function(t)

end
ole32.CoInitialize(nil)

local closure = function(lpParameter, bTimerOrWaitFired)
    callback( t )
    print('callback')
end
local ret = ffi.new('NTSTATUS')
local ret_timer = ffi.new('PHANDLE')
local que = ffi.C.CreateTimerQueue()
local cb =  ffi.new('WaitOrTimerCallback', closure)
local cb_param = ffi.cast('int*', 123)

print( ffi.C.CreateTimerQueueTimer )


print '****'

print( ffi.C.CreateTimerQueueTimer(ret_timer, que , cb, cb_param, 1000, 1000, 0x20 + 0x10 + 0x80 + 0x100) )

print('---')

