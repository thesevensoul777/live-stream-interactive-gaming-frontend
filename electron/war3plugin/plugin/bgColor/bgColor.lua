require "localization"
local ffi = require "ffi"

local loader = {}
local SetCurrentDirectoryW = ffi.C.SetCurrentDirectoryW
local GetCurrentDirectoryW = ffi.C.GetCurrentDirectoryW

loader.load = function(path)
	local path_current = ffi.new("wchar_t[260]")
	GetCurrentDirectoryW(260, path_current)

	local s, r = pcall(ffi.load, __(path:string()))

	if not s then
		log.error('failed: ' .. r)
		return false
	end
	SetCurrentDirectoryW(path_current)
	loader.dll = r

	ffi.cdef[[
		bool unload();
	]]

	return true
end

loader.unload = function()
	loader.dll.unload()
end

return loader
