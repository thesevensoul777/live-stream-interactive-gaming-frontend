local ffi = require("ffi")
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

    
]]
---@class mTimer
local mt = {}

---@class timer
---@field uIDEvent int timer标识
---@field timer int timer句柄
local ct = {
    hwnd = ffi.NULL,
}
ct.__index = ct

local __IDEvent = 0

local SetTimer = ffi.C.SetTimer
local KillTimer = ffi.C.KillTimer

---@param delay number 秒
---@param callback fun(timer:timer)
---@return timer|nil
function mt:once( delay, callback )
    ---@class timer
    local t = setmetatable({}, ct)
    local timer
    __IDEvent = __IDEvent + 1
    timer = SetTimer(t.hwnd, ffi.cast('UINT_PTR',__IDEvent), delay * 1000, function (hWnd, uIDEvent)
        KillTimer(hWnd, ffi.cast('UINT_PTR',uIDEvent))
        callback( t )
    end)
    if timer == 0 then
        log.debug("timer:once - SetTimer 0(return: 0)")
        return

    end

    t.timer = timer
    t.callback = callback
    t.delay = delay

    --t.hwnd = 0
    t.uIDEvent = __IDEvent

    return t
end


---@param delay number 秒
---@param callback fun(timer:timer)
---@return timer|nil
function mt:loop( delay, callback )
    ---@class timer
    local t = setmetatable({}, ct)
    local timer
    __IDEvent = __IDEvent + 1
    t.closure = function (hWnd, uIDEvent)
        callback( t )
    end
    timer = SetTimer(t.hwnd, __IDEvent, delay * 1000 , t.closure)

    if timer == 0 then
        print("(loop)SetTimer error")
        return
    end

    t.timer = timer
    t.callback = callback
    t.delay = delay

    t.hwnd = t.hwnd
    t.uIDEvent = __IDEvent

    return t
end


function mt:setHwnd( hWnd )
    --log.debug( 'timer_hwnd', hWnd )
    if type(hWnd)  == 'number' then
        hWnd = ffi.cast('HWND', hWnd)
    end
    ct.hwnd = hWnd
    return self
end

function ct:del()
    return KillTimer(self.hwnd, self.uIDEvent) or KillTimer(self.hwnd, self.timer)
end


return mt