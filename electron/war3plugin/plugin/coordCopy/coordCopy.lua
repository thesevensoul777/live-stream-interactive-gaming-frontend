require "localization"
local ffi = require "ffi"
local u2w = require 'ffi.unicode'.u2w
local L = function ( u )
	return (u2w( u ))
end

local path_plug = debug.getinfo(1).source:match("@?(.*)[/\\]")
local path_plugs = path_plug:match("^(.*)[/\\]")

local locPath = package.path
package.path =  path_plug .. '\\?.lua;' .. package.path
package.path =  path_plugs .. '\\?.lua;' .. package.path
package.path =  path_plugs .. '\\Lua\\?.lua;' .. package.path

require 'ffi.Core'
require 'ffi.window'
require 'ffi.hMenu'
local timer = require 'ffi.timer'
local inlinehook = require 'mod.inlinehook'

package.path = locPath

local loader = {}


local mt = {}

local MIIM_TYPE = 16
local MFT_STRING = 0
local MIIM_SUBMENU = 4
local MIIM_ID = 2
local MIIM_STATE = 1

local MFS_DEFAULT = 0x1000
local MFS_DISABLED = 0x200
local MFS_GRAYED = 0x10
local MFS_CHECKED = 0x8

local MF_BYCOMMAND = 0x400
local MF_BYPOSITION = 0x400

local XGPLUGIN_MENU_ID = 3000
local XGPLUGIN_MENU_TITLE, XGPLUGIN_MENU_TITLE_LENGTH = u2w'雪月插件'

function mt:getXGPmenu( hwnd )
	local hMenu = ffi.C.GetMenu( hwnd )

	local lpmi = ffi.new("MENUITEMINFOW", nil)
	lpmi.cbSize = ffi.sizeof(lpmi)
	lpmi.fMask = MFT_STRING | MIIM_TYPE | MIIM_ID | MIIM_STATE | MIIM_SUBMENU
	lpmi.fType = MFT_STRING
	lpmi.fState = MFS_DEFAULT
	lpmi.wID = XGPLUGIN_MENU_ID
	lpmi.hSubMenu = hMenu
	lpmi.dwTypeData = ffi.new("wchar_t[?]", 260)
	lpmi.cch = 260

	if ffi.C.GetMenuItemInfoW( hMenu, XGPLUGIN_MENU_ID, 0, lpmi ) == false then
		lpmi.dwTypeData = ffi.new("wchar_t[?]", XGPLUGIN_MENU_TITLE)
		lpmi.cch = XGPLUGIN_MENU_TITLE_LENGTH + 1

		lpmi.hSubMenu = ffi.C.CreatePopupMenu ()
		if ffi.C.InsertMenuItemW( hMenu, XGPLUGIN_MENU_ID, 0, lpmi ) == false then
			return 0
		end
	end

	return lpmi.hSubMenu
end

local MENU_ID_COORDCOPY = 30300
local MENU_TITLE_COORDCOPY, MENU_TITLE_COORDCOPY_LENGTH = u2w'坐标复制'
function mt:addMenu( hMenu )
	local lpmi = ffi.new("MENUITEMINFOW", nil)
	lpmi.cbSize = ffi.sizeof(lpmi)
	lpmi.fMask = MFT_STRING | MIIM_TYPE | MIIM_ID | MIIM_STATE
	lpmi.fType = MFT_STRING
	lpmi.fState = MFS_DEFAULT
	lpmi.hSubMenu = hMenu

	lpmi.wID = MENU_ID_COORDCOPY

	lpmi.dwTypeData = MENU_TITLE_COORDCOPY
	lpmi.cch = MENU_TITLE_COORDCOPY_LENGTH + 1

	return ffi.C.InsertMenuItemW( hMenu, MENU_ID_COORDCOPY, 0, lpmi )
end

---初始化插件内容
function mt:init( hwnd )
	log.info('coordCopy - init')

	local xgp = self:getXGPmenu(hwnd)
	if xgp == 0 then
		return
	end

	if self:addMenu( xgp ) == false then
		return
	end

	return true
end

function mt:load()
	local wstr_className = L'Warcraft III'
	local childWindow = ffi.new('HWND')
	local curPID = ffi.C.GetCurrentProcessId()

	local retPID = ffi.new('int[1]', 0)

	local max_try = 100

	while true do
		max_try = max_try - 1
		if max_try == 0 then
			log.error('coordCopy - failed to find war3Editor window')
			break
		end
		childWindow = ffi.C.FindWindowExW(ffi.NULL, childWindow, wstr_className, nil)

		if childWindow == ffi.NULL then
			log.error('coordCopy - failed to find war3Editor window')
			break
		end

		local thread = ffi.C.GetWindowThreadProcessId( childWindow, retPID )
		if retPID[0] == curPID then
			return mt:init( ffi.cast('int',childWindow) )
		end

	end
end



ffi.cdef[[

	//CallWindowProcW
	
]]


ffi.cdef[[
	typedef HWND (__stdcall *lua_CreateWindowExA)(
		DWORD   dwExStyle,
		LPCSTR lpClassName,
		LPCSTR lpWindowName,
		DWORD   dwStyle,
		int      x,
		int      y,
		int      nWidth,
		int      nHeight,
		HWND    hWndParent,
		HMENU   hMenu,
		HINSTANCE hInstance,
		LPVOID   lpParam
	);

	typedef int (__stdcall *lua_MessageBoxA)(
		HWND    hWnd,
		LPCSTR lpText,
		LPCSTR lpCaption,
		UINT    uType
	);

	//CallWindowProcW
	LRESULT CallWindowProcA(
		WNDPROC lpPrevWndFunc,
		HWND    hWnd,
		UINT    Msg,
		WPARAM  wParam,
		LPARAM  lParam
	);

]]
---@type inlinehook
local hook_CWEXA
local xt = require 'xgthunk'

local hWar3
local function timer_callback(t)
	--mt:init( hWar3 )
	log.debug('timer_callback')
end


local lua_CreateWindowExA = function (dwExStyle, lpClassName, lpWindowName, dwStyle, x, y, nWidth, nHeight, hWndParent, hMenu, hInstance, lpParam)
	log.trace( 'CreateWindowExA', xt.readString(lpClassName), xt.readString(lpWindowName) )
	log.debug( 'params:', dwExStyle, lpClassName, lpWindowName, dwStyle, x, y, nWidth, nHeight, hWndParent, hMenu, hInstance, lpParam)
	--128	151535156	151661764	0	0	0	0	0	0	0	148832256	0
	
	--params:	262144	80653560	80654256	114229248	2147483648	2147483648	2147483648	2147483648	0	0	4194304	208339136
	--2024-08-23 11:44:51. 71 [lua]-[debug] 1976139152	119799808

	local className = xt.readString(lpClassName)

	hook_CWEXA:pause()
	local ret = xt.call(hook_CWEXA.real,
		dwExStyle,
		lpClassName,
		lpWindowName,
		dwStyle,
		x,
		y,
		nWidth,
		nHeight,
		hWndParent,
		hMenu,
		hInstance,
		lpParam
	)
	hook_CWEXA:resume()


	if className == 'Warcraft III' then
		hWar3 = ret
		timer:setHwnd(ret)
		local t = timer:once( 1,  timer_callback)
		log.debug('timer_ret:', t.timer)
	end

	log.debug( 'ret:', ret )
	return ret
end



local fake_WNDPROC = function (hWnd, Msg, wParam, lParam)
	log.trace( 'lua_WNDPROC' )
	return 0
end

local isLoaded = false
loader.load = function(path)
	if isLoaded then return end
	isLoaded = true
	if not xt then
		return
	end
	local fake = xt.new( lua_CreateWindowExA, 12 )

	local real = inlinehook:GetSystemProcAddress('CreateWindowExA')

	hook_CWEXA = inlinehook:hook( real, fake )
	log.debug 'hook suc'
	return true
end



loader.unload = function()
	hook_CWEXA:unhook()


end

return loader
