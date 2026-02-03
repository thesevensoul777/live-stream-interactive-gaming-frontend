--[[
	** NoConsole **
	** Version 2.0.0 **

	** Description **
	- 拦截 AllocConsole，禁止创建控制台窗口
    - 1.0.0 : 直接拦截 AllocConsole
    - 2.0.0 : 放行 AllocConsole, 捕获控制台窗口句柄对其隐藏, hook ShowWindow, 控制台窗口不显示

	** Author **
	- 雪月灬雪歌
    - 鸣谢: 泠神
]]

require "localization"

local path_plug = debug.getinfo(1).source:match("@?(.*)[/\\]")
local path_plugs = path_plug:match("^(.*)[/\\]")

local locPath = package.path
package.path =  path_plug .. '\\?.lua;' .. package.path
package.path =  path_plugs .. '\\?.lua;' .. package.path
package.path =  path_plugs .. '\\Lua\\?.lua;' .. package.path

require 'ffi.Core'
local mem = require 'ffi.memory' ---@type Memory

local asm = require 'mod.asm'

package.path = locPath


local ffi = require "ffi"
local C = ffi.C
ffi.cdef[[
		
]]

local loader = {}


local ptr_hWndConsole = C.VirtualAlloc(nil, 0x4, 0x1000, 0x40)
local lib_kernel32 = C.GetModuleHandleA("kernel32.dll")
local lib_user32 = C.GetModuleHandleA("user32.dll")
local real_AllocConsole = C.GetProcAddress
(
    lib_kernel32,
    ffi.cast('uint32_t', "AllocConsole")
)
local GetConsoleWindow = C.GetProcAddress(
    lib_kernel32,
    ffi.cast('uint32_t', "GetConsoleWindow")
)
local real_ShowWindow = C.GetProcAddress(
    lib_user32,
    ffi.cast('uint32_t', "ShowWindow")
)

local fake_AllocConsole
local fake_ShowWindow
local oldProtect_AllocConsole = ffi.new("unsigned long[1]")
local oldProtect_ShowWindow = ffi.new("unsigned long[1]")

local originData_AllocConsole = C.VirtualAlloc(nil, 7, 0x1000, 0x40)
local originData_ShowWindow = C.VirtualAlloc(nil, 7, 0x1000, 0x40)

local hookData_AllocConsole = C.VirtualAlloc(nil, 7, 0x1000, 0x40)
local hookData_ShowWindow = C.VirtualAlloc(nil, 7, 0x1000, 0x40)

loader.load = function(path)

	local s = C.VirtualProtect(real_AllocConsole, 7, 0x40, oldProtect_AllocConsole)

	if s == false then
		log.error('failed: VirtualProtect AllocConsole')
		return false
	end

	--备份原始函数头
	ffi.copy(originData_AllocConsole, real_AllocConsole, 7)

	--构造一个函数，调用原函数后，使用ShowWindow将其隐藏
	--注释每句汇编代码
	-- int fake_AllocConsole()
	local data = {
		0x55,                                    -- push ebp ; 保存ebp
		0x89, 0xE5,                              -- mov ebp, esp ; 设置ebp为栈顶
		0x53,                                    --push ebx
		0x56,                                    --push esi
		0x57,                                    --push edi
        0x52,                                    --push edx

		0xBE, '4:originData', 0x00, 0x00, 0x00,  -- mov esi, originData ; 源地址
		0xBF, '4:real_AllocConsole', 0x00, 0x00, 0x00, -- mov edi, real_AllocConsole ; 目标地址
		0xB9, 0x07, 0x00, 0x00, 0x00,            -- mov ecx, 0x7  ; 复制的长度
		0xF3, 0xA4,                              -- rep movsb

		0xBB, '4:real_AllocConsole', 00, 00, 00, -- mov eax, real_AllocConsole
		0xFF, 0xD3,                              -- call eax ; 调用原函数
		0x89, 0xC2,                             --mov edx,eax

		0xBB, '4:GetConsoleWindow', 00, 00, 00,  -- mov ebx, GetConsoleWindow
		0xFF, 0xD3,                              -- call ebx ; 获取控制台窗口句柄
        --记录句柄
		0xA3, '4:ptr_hWndConsole', 0x00, 0x00, 0x00, --mov [ptr_hWndConsole], eax

		0x6A, 0x00,                  -- //push 0 ; SW_HIDE
		0x50,                        -- //push eax ; GetConsoleWindow的返回值
		0xBB, '4:ShowWindow', 00, 00, 00, -- mov ebx, ShowWindow
		0xFF, 0xD3,                  -- call ebx ; 隐藏控制台窗口

		0xBE, '4:hookData', 0x00, 0x00, 0x00,  -- mov esi, hookData ; 源地址
		0xBF, '4:real_AllocConsole', 0x00, 0x00, 0x00, -- mov edi, real_AllocConsole ; 目标地址
		0xB9, 0x07, 0x00, 0x00, 0x00,            -- mov ecx, 0x7  ; 复制的长度
		0xF3, 0xA4,                              -- rep movsb

        0x89, 0xD0,					 --mov eax, edx
        0x5A,                        --pop edx
		0x5F,                        --pop edi
		0x5E,                        --pop esi
		0x5B,                        --pop ebx
		0x89, 0xEC,                  -- mov esp, ebp ; 恢复esp
		0x5D,                        -- pop ebp ; 恢复ebp
		0xC2, 0x00, 0x00,            --ret 0
        --199,128,255,0,0,0,12,0,0,0, -- mov [ebp],  0x12345678
	}
	local dataSize = #data
	fake_AllocConsole = C.VirtualAlloc(nil, dataSize, 0x1000, 0x40) --MEM_COMMIT 0x1000
	i = tonumber(fake_AllocConsole)
	local temp  = ffi.new(
		"uint8_t[7]",
		{
			0xB8, i & 0xFF,  (i >> 8) & 0xFF, (i >> 16) & 0xFF, (i >> 24) & 0xFF, -- mov eax, fake_AllocConsole
			0xFF, 0xE0, -- jmp eax
		}
	)
	ffi.copy(hookData_AllocConsole, temp, 7)

	local params = {
		originData = tonumber(originData_AllocConsole),
		hookData = tonumber(hookData_AllocConsole),
		fake_AllocConsole = tonumber(fake_AllocConsole),
		real_AllocConsole = tonumber(real_AllocConsole),
        GetConsoleWindow = tonumber(GetConsoleWindow),
        ptr_hWndConsole = tonumber(ptr_hWndConsole),
		ShowWindow = tonumber(C.GetProcAddress(lib_user32, ffi.cast('uint32_t', "ShowWindow"))),

		MessageBoxA = tonumber(C.GetProcAddress(lib_user32, ffi.cast('uint32_t', "MessageBoxA"))),
		wsprintf = tonumber(C.GetProcAddress(lib_user32, ffi.cast('uint32_t', "wsprintfA"))),

		caption = tonumber(ffi.new("const char *", "Hellow")),
		message = tonumber(ffi.new("const char *", "QAQ")),
		format = tonumber(ffi.new("const char *", "[ptr]ShowWindow = %x\n msg = %x")),
	}

	-- 将字符串代码转换为对应字节码
	local i = 1
	while i <= dataSize do
		local v = data[i]
		if type(v) ~= 'string' then
			i = i + 1
			goto next
		end
		local num, name = v:match("(%d+):(.+)")
		if num and name then
			for j = 0, num-1 do
				data[i + j] = (params[name] >> (j*8) ) & 0xFF
			end
			i = i + num - 1
			log.debug( ('ASM Parameter loaded %d byte(%s) = %d'):format( num, name, params[name] ) )
		else
			log.error('ASM Parameter Error: ' .. v)
		end

		i = i + 1
		::next::
	end

	data = ffi.new("uint8_t[?]", dataSize, data )
	ffi.copy(fake_AllocConsole, data, dataSize)

	log.debug( ('fake_AllocConsole = %x'):format(fake_AllocConsole) )

	ffi.copy(real_AllocConsole, hookData_AllocConsole, 7) -- Hook



	-- **** Hook ShowWindow ****

	s = C.VirtualProtect(real_ShowWindow, 7, 0x40, oldProtect_ShowWindow)

	if s == false then
		log.error('failed: VirtualProtect - ShowWindow')
		return false
	end

--[[
	data = {
		0x55,                                    -- push ebp ; 保存ebp
		0x89, 0xE5,                              -- mov ebp, esp ; 设置ebp为栈顶
		0x53,                                    --push ebx
		0x56,                                    --push esi
		0x57,                                    --push edi

		0xBE, '4:originData', 0x00, 0x00, 0x00,  -- mov esi, originData ; 源地址
		0xBF, '4:real_ShowWindow', 0x00, 0x00, 0x00, -- mov edi, real_ShowWindow ; 目标地址
		0xB9, 0x07, 0x00, 0x00, 0x00,            -- mov ecx, 0x7  ; 复制的长度
		0xF3, 0xA4,                              -- rep movsb

        0x3B, 0x45, 0x08, --cmp eax, [ebp+8]    ; 比较参数1: 
		'je label_1', 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, -- 如果相等,跳转到label_1

		0xBB, '4:real_ShowWindow', 00, 00, 00, -- mov eax, real_AllocConsole
		0xFF, 0xD3,                              -- call eax ; 调用原函数
		0x89, 0xC2,                              --mov edx, eax

		0x6A, 0x00,                         -- //push 0 ; SW_HIDE
		0x50,                               -- //push eax ; GetConsoleWindow的返回值
		0xBB, '4:ShowWindow', 00, 00, 00,   -- mov ebx, ShowWindow
		0xFF, 0xD3,                         -- call ebx ; 隐藏控制台窗口

		0xBE, '4:hookData', 0x00, 0x00, 0x00,  -- mov esi, hookData ; 源地址
		0xBF, '4:real_AllocConsole', 0x00, 0x00, 0x00, -- mov edi, real_AllocConsole ; 目标地址
		0xB9, 0x07, 0x00, 0x00, 0x00,            -- mov ecx, 0x7  ; 复制的长度
		0xF3, 0xA4,                              -- rep movsb
        'label_1:',
		0x5F,                        --pop edi
		0x5E,                        --pop esi
		0x5B,                        --pop ebx
		0x89, 0xD0,					 --mov eax, edx
		0x89, 0xEC,                  -- mov esp, ebp ; 恢复esp
		0x5D,                        -- pop ebp ; 恢复ebp
		0xC2, 0x00, 0x00,            --ret 0
	}
]]
	data = [[
		; 保存场景
		push ebp
		mov ebp, esp 
		push ebx
		push esi
		push edi
		push ecx

		mov esi, 4:originData       ;源地址
		mov edi, 4:real_ShowWindow  ;目标地址
		mov ecx, 0x7
		rep movsb

		mov eax, [4:ptr_hWndConsole]
		cmp eax, [ebp+8]
		jne label_1 ;如果不为控制台窗口,跳转到label_1

		; 隐藏控制台窗口
		push 0
		push eax
        jmp label_2


        label_1: ; 正常调用的参数
        push [ebp+0x0C]
        push [ebp+8]
        
        label_2:
		mov ebx, 4:real_ShowWindow
		call ebx

		mov esi, 4:hookData
		mov edi, 4:real_ShowWindow
		mov ecx, 0x7
		rep movsb

		; 恢复场景
		pop ecx
		pop edi
		pop esi
		pop ebx
		mov esp, ebp
		pop ebp
		ret 8
	]]
    params = {
		originData = tonumber(originData_ShowWindow),
		hookData = tonumber(hookData_ShowWindow),
		real_ShowWindow = tonumber(real_ShowWindow),
		ShowWindow = tonumber(C.GetProcAddress(lib_user32, ffi.cast('uint32_t', "ShowWindow"))),
		ptr_hWndConsole = tonumber(ptr_hWndConsole),
	}
	-- 将字符串代码转换为对应字节码
	data = data:gsub('(%d+):([^%s\r\n%];]+)',function (num, name)
		local s = params[name]
		if not s then
			log.error( ('ASM: %s not found'):format(name) )
		end
        return s
    end)
	--log.debug( data )
	data, dataSize = asm:setEIP( 0 ):compile( data )

    fake_ShowWindow = C.VirtualAlloc(nil, dataSize, 0x1000, 0x40) --MEM_COMMIT 0x1000
	i = tonumber( fake_ShowWindow )
	temp  = ffi.new(
		"uint8_t[7]",
		{
			0xB8, i & 0xFF,  (i >> 8) & 0xFF, (i >> 16) & 0xFF, (i >> 24) & 0xFF, -- mov eax, real_ShowWindow
			0xFF, 0xE0, -- jmp eax
		}
	)
    ffi.copy(originData_ShowWindow, real_ShowWindow, 7)
	ffi.copy(hookData_ShowWindow, temp, 7)

	data = ffi.new("uint8_t[?]", dataSize, data )
	ffi.copy(fake_ShowWindow, data, dataSize)

    log.debug( ('fake_ShowWindow = %x'):format(fake_ShowWindow) )
	ffi.copy(real_ShowWindow, hookData_ShowWindow, 7) -- 挂钩
	--log.debug( table.concat(data, ' ') )
	return true
end

loader.unload = function()
	--loader.dll.unload()
    ffi.copy(real_AllocConsole, originData_AllocConsole, 7) -- 恢复
    ffi.copy(real_ShowWindow, originData_ShowWindow, 7) -- 恢复

    if oldProtect_AllocConsole[0] ~= 0 then
        C.VirtualProtect(real_AllocConsole, 7, oldProtect_AllocConsole[0], nil)
        C.VirtualFree(fake_AllocConsole, 0, mem.MEM_RELEASE)
        C.VirtualFree(originData_AllocConsole, 0, mem.MEM_RELEASE)
        C.VirtualFree(hookData_AllocConsole, 0, mem.MEM_RELEASE)
    end
    if oldProtect_ShowWindow[0] ~= 0 then
        C.VirtualProtect(real_ShowWindow, 7, oldProtect_ShowWindow[0], nil)
        C.VirtualFree(fake_ShowWindow, 0, mem.MEM_RELEASE)
        C.VirtualFree(originData_ShowWindow, 0, mem.MEM_RELEASE)
        C.VirtualFree(hookData_ShowWindow, 0, mem.MEM_RELEASE)
    end

    oldProtect_AllocConsole = nil
    oldProtect_ShowWindow = nil
    log.debug( 'NoConsole - unload successed' )
end


return loader
