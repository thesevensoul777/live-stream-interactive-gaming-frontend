require "localization"
local ffi = require "ffi"

local loader = {}
local SetCurrentDirectoryW = ffi.C.SetCurrentDirectoryW
local GetCurrentDirectoryW = ffi.C.GetCurrentDirectoryW

loader.load = function(path)
	local path_current = ffi.new("wchar_t[260]")
	GetCurrentDirectoryW(260, path_current)
	--[[
	if global_config["MapTest"]["VirtualMpq"] == "" then
		log.warn('failed: disable')
		return false
	end
	]]
	local s, r = pcall(ffi.load, __(path:string()))
			
	if not s then
		log.error('failed: ' .. r)
		return false
	end
	SetCurrentDirectoryW(path_current)
	loader.dll = r
--
	ffi.cdef[[
		bool unload(void);
	]]
--[[
	if not loader.dll.SetFontByName(name, tonumber(size)) then
		log.error('failed: in YDFont.dll!SetFontByName')
		return  false
	end
]]
	return true
end

loader.unload = function()
	loader.dll.unload()
end

return loader
