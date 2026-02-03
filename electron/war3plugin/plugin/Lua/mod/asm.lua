---
--- 简易汇编编译器 X86
--- 雪月灬雪歌
--- 2021/8/1 23:01
--- 

local mt = {
    eip = 0
}
local string_pack = string.pack
local string_unpack = string.unpack
local string_byte = string.byte
local string_sub = string.sub
local string_gsub = string.gsub
local string_format = string.format
local type = type
local table_unpack = table.unpack
local xpcall = xpcall

local error = function (msg)
    log.error(msg)
end

local map_register = {
    ['eax'] = 0,
    ['ebx'] = 3,
    ['ecx'] = 1,
    ['edx'] = 2,
    ['esi'] = 6,
    ['edi'] = 7,
    ['esp'] = 4,
    ['ebp'] = 5,

    ['cl'] = 1,
    ['ch'] = 5,

    ['dl'] = 2,
    ['dh'] = 6,

    ['bl'] = 3,
    ['bh'] = 7,

    ['al'] = 0,
    ['ah'] = 4,
}

local map_mov_r_m = {
    ['eax'] = {0xA1},
    ['ecx'] = {0x8B, 0x0D},
    ['ebx'] = {0x8B, 0x1D},
    ['ebp'] = {0x8B, 0x2D},
    ['edi'] = {0x8B, 0x3D},

    ['edx'] = {0x8B, 0x15},
    ['esp'] = {0x8B, 0x25},
    ['esi'] = {0x8B, 0x35},
}
local map_mov_m_r = {
    ['eax'] = {0xA3},
    ['ecx'] = {0x89, 0x0D},
    ['ebx'] = {0x89, 0x1D},
    ['ebp'] = {0x89, 0x2D},
    ['edi'] = {0x89, 0x3D},

    ['edx'] = {0x89, 0x15},
    ['esp'] = {0x89, 0x25},
    ['esi'] = {0x89, 0x35},
}


local map_mov_rm_i = {
    ['eax'] = {0},
    ['ebx'] = {3},
    ['ecx'] = {1},
    ['edx'] = {2},
    ['esi'] = {6},
    ['edi'] = {7},
    ['esp'] = {0x4, 0x24},
    ['ebp'] = {0x45,0x00},
}



local map_asm =
{
    ['mov'] = {
        ['reg, reg'] = function (reg1, reg2) -- mov eax, ebx
            if not map_register[reg1] or not map_register[reg2] then
                error('invalid register:' .. (reg1 or 'nil') .. ',' .. (reg2 or 'nil'))
            end
            return { 0x8B, 0xC0 + (map_register[reg1] << 3) + map_register[reg2] }
        end,
        ['reg, int32'] = function (reg1, int32)  -- mov eax, 0x12345678
            return {
                0xB8 + (map_register[reg1]),
                (int32 & 0xFF), (int32 >> 8 & 0xFF),
                (int32 >> 16 & 0xFF), (int32 >> 24 & 0xFF)
            }
        end,
        ['reg, ptr'] = function (reg, mem)  -- mov eax, [0x12345678]
            local t = map_mov_r_m[reg]
            local ret = {}
            local size = 0
            for i = 1, #t do
                size = size + 1
                ret[size] = t[i]
            end
            ret[size + 1] = (mem & 0xFF)
            ret[size + 2] = (mem >> 8 & 0xFF)
            ret[size + 3] = (mem >> 16 & 0xFF)
            ret[size + 4] = (mem >> 24 & 0xFF)
            return ret
        end,
        ['reg, [reg + offset]'] = function (reg1, reg2, offset) -- mov eax, [ebx + offset]
            local ret = { 0x8B, 0x40, 0x00 }
            local size = 3
            if offset < 127 and offset > -128 then
                if offset > 0 then
                    ret[3] = offset
                else
                    ret[3] = 0xFF - offset + 1
                end
            else
                ret[2] = 0x80
                ret[size + 1] = (offset & 0xFF)
                ret[size + 2] = (offset >> 8 & 0xFF)
                ret[size + 3] = (offset >> 16 & 0xFF)
                ret[size + 4] = (offset >> 24 & 0xFF)
            end
            ret[2] = ret[2] + (map_register[reg1] << 3) + map_register[reg2]
            return ret
        end,

        ['ptr, reg'] = function (mem, reg)   -- mov [0x12345678], ebx
            local t = map_mov_m_r[reg]
            local ret = {}
            local size = 0
            for i = 1, #t do
                size = size + 1
                ret[size] = t[i]
            end
            ret[size + 1] = (mem & 0xFF)
            ret[size + 2] = (mem >> 8 & 0xFF)
            ret[size + 3] = (mem >> 16 & 0xFF)
            ret[size + 4] = (mem >> 24 & 0xFF)
            return ret
        end,
        ['ptr, int32'] = function (mem, int32)
            return {
                0xC7, 0x05,
                (mem & 0xFF), (mem >> 8 & 0xFF), (mem >> 16 & 0xFF), (mem >> 24 & 0xFF),
                (int32 & 0xFF), (int32 >> 8 & 0xFF), (int32 >> 16 & 0xFF), (int32 >> 24 & 0xFF)
            }
        end,

        ['[reg], reg'] = function (reg1, reg2) -- mov [eax], ebx
            return { 0x8B, 0x18 + (map_register[reg1] << 3) + map_register[reg2] }
        end,
        ['[reg], int32'] = function (reg, int32)  -- mov [eax], 0x12345678
            local t = map_mov_rm_i[reg]
            local ret = { 0xC7, }
            local size = 1
            for i = 1, #t do
                size = size + 1
                ret[size] = t[i]
            end
            ret[size + 1] = (int32 & 0xFF)
            ret[size + 2] = (int32 >> 8 & 0xFF)
            ret[size + 3] = (int32 >> 16 & 0xFF)
            ret[size + 4] = (int32 >> 24 & 0xFF)
            return ret
        end,

        ['[reg + offset], int32'] = function (reg, int32, offset)  -- mov [eax+0x12345678], 0x12345678
            local ret = {0xC7, 0xC0, 0x00}
            local size = 3
            ret[2] = 0xC0 + (map_register[reg])
            if offset < 255 and offset > -255 then -- int8
                if offset > 0 then
                    ret[3] = offset
                else
                    ret[3] = 0xFF - offset + 1
                end
            else -- int32
                ret[size]     = (offset >> 24) % 256
                ret[size + 1] = (offset >> 16) % 256
                ret[size + 2] = (offset >> 8) % 256
                ret[size + 3] = (offset % 256)
                size = size + 3
            end
            -- uint32
            ret[size + 1] = (int32 & 0xFF)
            ret[size + 2] = (int32 >> 8 & 0xFF)
            ret[size + 3] = (int32 >> 16 & 0xFF)
            ret[size + 4] = (int32 >> 24 & 0xFF)
            return ret
        end,
    }
}


--- mov eax, ebx
--- mov eax, [0x12345678]
--- mov eax, [ebx]
--- mov [eax], ebx
--- mov [ebx], 0x12345678
--- mov [eax+0x12345678], 0x12345678
--- mov [eax+0x12345678], ebx
--- mov [0x12345678], 0x12345678
---@param v1 any
---@param v2 any
---@return table
function mt:mov( v1, v2 )
    local method = ''
    local offset
    local bPtr = 0
    if type(v1) == 'string' then
        if v1:sub(1,1) == '[' then
            bPtr = bPtr + 1
            v1 = v1:sub(2, -2)
            offset = v1:match('%-?%d+%s*$')
            if not offset then
                offset = v1:match('%-?0x%x+')
            end
            if v1:sub(1,1) == 'e' then -- eax
                v1 = v1:sub(1, 3)
                if offset then
                    method = '[reg + offset], ' -- mov [eax+0x12345678], *
                    if offset:sub(1,2) == '0x' then
                        offset = ('%d'):format(offset) // 1 >> 0
                    end
                    offset = offset // 1 >> 0
                else
                    method = '[reg], ' -- mov [eax], *
                end
            else
                if v1:sub(1,2) == '0x' then -- pointer
                    v1 = (v1 // 1 >> 0 )
                elseif v1:match('%d+') then
                    v1 = (v1 // 1 >> 0 )
                else
                    error('ASM: mov #1 pointer syntax error')
                end
                method = 'ptr, '
            end
        else
            method = 'reg, ' -- mov eax, *
        end
    else
        error('ASM: mov #1 must be string(register or pointer)')
    end

    if type(v2) == 'string' then
        if v2:sub(1,1) == '[' then
            bPtr = bPtr + 1
            v2 = v2:sub(2, -2)
            offset = v1:match('%-?%d+%s*$')
            if not offset then
                offset = v2:match('%-?0x%x+')
            end
            if v2:sub(1,1) == 'e' then -- eax
                v2 = v2:sub(1, 3)
                if offset then
                    method = '[reg + offset], ' -- mov [eax+0x12345678], *
                    if offset:sub(1,2) == '0x' then
                        offset = ('%d'):format(offset) // 1 >> 0
                    end
                    offset = offset // 1 >> 0
                else
                    method = '[reg], ' -- mov [eax], *
                end
            else
                if v2:sub(1,2) == '0x' then -- pointer
                    v2 = (v2 // 1 >> 0 )
                    method = method .. 'ptr'
                elseif v2:match('%d+') then
                    v2 = (v2 // 1 >> 0 )
                    method = method .. 'ptr'
                else
                    error('ASM: mov #1 pointer syntax error')
                end
            end
        else
            if v2:sub(1,2) == '0x' then -- int32
                v2 = (v2 // 1 >> 0 )
                method = method .. 'int32'
            elseif v2:match('%d+') then
                v2 = (v2 // 1 >> 0 )
                method = method .. 'int32'
            else
                method = method .. 'reg'
                --error('ASM: call #1 pointer syntax error.' .. v2)
            end
        end
    else
        method = method .. 'int32'
    end

    if bPtr > 1 then
        error('ASM: mov #1 can not have more than 1 pointer')
    end
    local code = map_asm['mov'][method]
    if code == nil then
        error('ASM: mov ' .. method .. ' not found')
    end
    return code(v1, v2, offset)
end

local map_push = {
    ['int32'] = function(v) -- push 0x12345678
        local ret = {0x6A, 0x00}
        if v < 128 and v > -128 then
            if v > 0 then
                ret[2] = v
            else
                ret[2] = 0xFF - v + 1
            end
        else
            ret[1] = 0x68
            ret[2] = v & 0xFF
            ret[3] = (v >> 8) & 0xFF
            ret[4] = (v >> 16) & 0xFF
            ret[5] = (v >> 24) & 0xFF
        end
        return ret
    end,
    ['reg'] = function(reg) -- push eax
        return {0x50 + map_register[reg]}
    end,
    ['ptr'] = function(mem) -- push [0x12345678]
        return {0xFF, 0x35, mem & 0xFF, (mem >> 8) & 0xFF, (mem >> 16) & 0xFF, (mem >> 24) & 0xFF}
    end,
    ['[reg]'] = function(reg) -- push [eax]
        return {0xFF, 0x30 + map_register[reg]}
    end,
    ['[reg + offset]'] = function(reg, offset) -- push [eax + 0x12345678]
        local ret = {0xFF, 0x70, 0x00}
        if offset < 128 and offset > -128 then
            if offset > 0 then
                ret[3] = offset
            else
                ret[3] = 0xFF - offset + 1
            end
        else
            ret[2] = 0xB0
            ret[3] = offset & 0xFF
            ret[4] = (offset >> 8) & 0xFF
            ret[5] = (offset >> 16) & 0xFF
            ret[6] = (offset >> 24) & 0xFF
        end
        ret[2] = ret[2] + map_register[reg]
        return ret
    end,
}

function mt:push(v)
    local offset
    local method = ''
    if type(v) == 'string' then
        if v:sub(1,1) == '[' then
            v = v:sub(2, -2)
            offset = v:match('%-?%d+%s*$')
            if not offset then
                offset = v:match('%-?0x%x+')
            end
            if v:sub(1,1) == 'e' then -- eax
                v = v:sub(1, 3)
                if offset then
                    if offset:sub(1,2) == '0x' then
                        offset = ('%d'):format(offset) // 1 >> 0
                    end
                    offset = offset // 1 >> 0
                    method = '[reg + offset]'
                else
                    method = '[reg]'
                end
            else
                if v:sub(1,2) == '0x' then -- pointer
                    v = (v // 1 >> 0 )
                elseif v:match('%d+') then
                    v = (v // 1 >> 0 )
                else
                    error('ASM: push #1 pointer syntax error')
                end
                method = 'ptr'
            end
        else
            if v:sub(1,2) == '0x' then -- int32
                v = (v // 1 >> 0 )
                method = 'int32'
            elseif v:match('%d+') then
                v = (v // 1 >> 0 )
                method = 'int32'
            else
                method = 'reg'
                --error('ASM: call #1 pointer syntax error.' .. v)
            end
        end
    else
        method = 'int32'
    end

    local code = map_push[method]
    if code == nil then
        error('ASM: push ' .. method .. ' not found')
    end
    return code(v, offset)
end

--- pop eax
function mt:pop(v)
    if type(v) ~= 'string' then
        error('ASM: pop #1 must be a register')
    end
    return {0x58 + map_register[v]} -- pop eax
end

--- 195 0xC3
--- retn
--- retn 0xffff
function mt:retn( n )
    if n == nil then
        return {0xC3}
    else
        return {0xC3, n & 0xFF, (n >> 8) & 0xFF}
    end
end

--- ret 0 [留空默认]
--- ret 0x1234
function mt:ret( n )
    if n == nil then
        return {0xC2, 0x00, 0x00}
    end
    return {0xC2, n & 0xFF, (n >> 8) & 0xFF}
end

--- 复制字节
--- esi: 源地址
--- edi: 目标地址
function mt:movsb()
    return {0xA4}
end

--- 复制字节 直到 ecx-- 为 0
--- ecx: 长度
--- esi: 源地址
--- edi: 目标地址
function mt:rep( cmd )
    if cmd == 'movsb' then
        return {0xF3, 0xA4}
    end
end

local map_call = {
    ['int32'] = function(v, eip) -- call 0x12345678  distance: 0x12345678
        if eip == nil then
            error('ASM: call #2 EIP is nil')
        end
        v = v // 1 >> 0
        v = v - eip - 5
        local ret = {0xE8, v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF}
        return ret
    end,
    ['ptr'] = function(v)
        local ret = {0xFF, 0x15, v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF}
    end,
    ['[reg]'] = function(v)
        local ret = {0xFF, 0x10 + map_register[v]}
        return ret
    end,
    ['[reg + offset]'] = function(v, offset)
        local ret = {0xFF, 0x50, 0x00}
        if offset < 128 and offset > -128 then
            if offset > 0 then
                ret[3] = offset
            else
                ret[3] = 0xFF - offset + 1
            end
        else
            ret[2] = 0x90
            ret[3] = offset & 0xFF
            ret[4] = (offset >> 8) & 0xFF
            ret[5] = (offset >> 16) & 0xFF
            ret[6] = (offset >> 24) & 0xFF
        end
        ret[2] = ret[2] + map_register[v]
        return ret
    end,
    ['reg'] = function(v)
        local ret = {0xFF, 0xD0 + map_register[v]}
        return ret
    end,
}

--- call eax
--- call [eax]
--- call [eax + 0x12345678]
--- call 0x12345678 [需填写EIP]
--- @param v any reg, ptr, int32(目标地址)
--- @param eip any 如果是 int32，EIP填写当前指令的地址，用于计算相对地址
function mt:call( v, eip )
    local method = ''
    if type(v) == 'string' then
        if v:sub(1,1) == '[' then
            v = v:sub(2, -2)
            eip = v:match('%-?%d+') -- offset
            if v:sub(1,1) == 'e' then -- eax
                v = v:sub(1, 3)
                if eip then
                    eip = eip // 1 >> 0
                    method = '[reg + offset]'
                else
                    method = '[reg]'
                end
            else
                if v:sub(1,2) == '0x' then -- pointer
                    v = (v // 1 >> 0 )
                elseif v:match('%d+') then
                    v = (v // 1 >> 0 )
                else
                    error('ASM: call #1 pointer syntax error. ' .. v)
                end
            end
        else
            
            if v:sub(1,2) == '0x' then -- int32
                v = (v // 1 >> 0 )
                method = 'int32'
            elseif v:match('%d+') then
                v = (v // 1 >> 0 )
                method = 'int32'
            else
                method = 'reg'
                --error('ASM: call #1 pointer syntax error.' .. v)
            end
        end
    else
        method = 'int32'
    end

    local code = map_call[method]
    if code == nil then
        error('ASM: call ' .. method .. ' not found')
    end
    return code(v, eip)
end

local map_cmp = {
    ['[reg], int32'] = function(reg, v) -- cmp [eax], 0x12345678
        local ret = {0x83, 0x38, 0x00}
        if v < 128 and v > -128 then
            ret[3] = v
        else
            ret[1] = 0x81
            ret[3] = v & 0xFF
            ret[4] = (v >> 8) & 0xFF
            ret[5] = (v >> 16) & 0xFF
            ret[6] = (v >> 24) & 0xFF
        end
        ret[2] = ret[2] + map_register[reg]
        return ret
    end,
    ['reg, int32'] = function(reg, v) -- cmp eax, 0x12345678
        local ret = {0x83, 0xF8, 0x00}
        if reg:sub(1,1) ~= 'e' then -- al ah
            ret[1] = 0x80
        end
        if v < 128 and v > -128 then
            ret[3] = v
        else
            ret[1] = 0x81
            ret[3] = v & 0xFF
            ret[4] = (v >> 8) & 0xFF
            ret[5] = (v >> 16) & 0xFF
            ret[6] = (v >> 24) & 0xFF
        end
        ret[2] = ret[2] + map_register[reg]
        return ret
    end,
    ['reg, reg'] = function(reg1, reg2) -- cmp eax, ebx
        local ret = {0x39, 0xC0 + (map_register[reg1] << 3) + map_register[reg2]}
        if reg1:sub(1,1) ~= 'e' then -- al ah
            ret[1] = 0x3A
        end
        return ret
    end,
    ['reg, [reg]'] = function(reg1, reg2) -- cmp eax, [ebx]
        local ret = {0x3B, 0x00 + (map_register[reg1] << 3) + map_register[reg2]}
        if reg2 == 'ebp' then
            ret[2] = ret[2] + 0x40
            ret[3] = 0x00
        end
        return ret
    end,
    ['reg, [reg + offset]'] = function(reg1, reg2, offset) -- cmp eax, [ebx + 0x12345678]
        if not map_register[reg1] or not map_register[reg2] then
            error('ASM: cmp reg, [reg + offset] ' .. (reg1 or 'nil') .. ' ' .. (reg2 or 'nil') .. ' ' .. (offset or 'nil'))
        end
        local ret = {0x3B, 0x40 + (map_register[reg1] << 3) + map_register[reg2], 0x00}
        if reg2 == 'ebp' then
            --ret[2] = ret[2] + 0x40
        end
        if offset < 128 and offset > -128 then
            --log.debug( 'offset=' .. (offset or 'nil') )
            if offset > 0 then
                ret[3] = offset
            else
                ret[3] = 0xFF + offset + 1
            end
        else
            ret[2] = 0x80
            ret[3] = (offset & 0xFF)
            ret[4] = (offset >> 8) & 0xFF
            ret[5] = (offset >> 16) & 0xFF
            ret[6] = (offset >> 24) & 0xFF
        end
        return ret
    end,
    ['reg, ptr'] = function(reg1, v) -- cmp eax, [0x12345678]
        local ret = {
            0x3B, 0x05 + (map_register << 3) ,
            v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF
        }
        if reg1:sub(1,1) ~= 'e' then -- al ah
            ret[1] = 0x3A
        end
        return ret
    end


}

--- cmp eax, 0x12345678
--- cmp eax, ebx
--- cmp eax, [ebx]
--- cmp eax, [ebx + 0x12345678]
--- cmp al, [0x12345678]
--- cmp al, ah
--- cmp [eax], 0x12345678
function mt:cmp( reg1, reg2 )
    local method = ''
    local offset
    if reg1:sub(1,1) == '[' then
        method = '[reg], '
    else
        method = 'reg, '
    end
    if type(reg2) == 'string' then
        if reg2:sub(1,1) == '[' then
            reg2 = reg2:sub(2, -2)
            offset = reg2:match('%-?%d+')
            if offset then
                reg2 = reg2:match('(%w+)[%-%+]?%d+')
                offset = (offset // 1 >> 0)
            end
            method = method .. '[reg + offset]'
        else
            if v:sub(1,2) == '0x' then -- int32
                v = (v // 1 >> 0 )
                method = method .. 'int32'
            elseif v:match('%d+') then
                v = (v // 1 >> 0 )
                method = method .. 'int32'
            else
                method = method .. 'reg'
            end
        end
    elseif type(reg2) == 'number' then
        method = method .. 'ptr'
    end

    local code = map_cmp[method]
    if code == nil then
        error('ASM: cmp ' .. method .. ' not found')
    end
    return code(reg1, reg2, offset)

end

function mt:je( mem )
    local ret = {0x74, 0x00}

    --ret[2] = labels[mem] - self.eip - size - 2
    if mem < 128 and mem > -128 then
        ret[2] = mem
    else
        ret[1] = 0x0F
        ret[2] = 0x84
        ret[3] = (mem >> 24) % 256
        ret[4] = (mem >> 16) % 256
        ret[5] = (mem >> 8) % 256
        ret[6] = (mem >> 0) % 256
    end
    return ret
end

function mt:jne( mem )
    local ret = {0x75, 0x00}
    if mem < 128 and mem > -128 then
        ret[2] = mem
    else
        ret[1] = 0x0F
        ret[2] = 0x85
        ret[3] = (mem >> 24) % 256
        ret[4] = (mem >> 16) % 256
        ret[5] = (mem >> 8) % 256
        ret[6] = (mem >> 0) % 256
    end
    return ret
end

function mt:jmp( mem )
    local ret = {0xE9, 0x00, 0x00, 0x00, 0x00}

    ret[2] = (mem >> 24) % 256
    ret[3] = (mem >> 16) % 256
    ret[4] = (mem >> 8) % 256
    ret[5] = (mem >> 0) % 256

    return ret
end

---设置EIP
function mt:setEIP( eip )
    self.eip = eip
    return self
end



--[=[

asm[[
    label_start:
    mov eax, 0x12345678 
    cmp eax, ebx
    cmp eax, [ebx]
    cmp eax, [ebx + 0x12345678]
    cmp al, [0x12345678]
    cmp al, ah
    cmp [eax], 0x12345678
    ; 注释
    jmp label_start ; 无条件跳转
]]

]=]
function mt:compile( strCode )
    local asm = {}
    local msg = {}
    local errorCount = 0

    local machineCode = {}
    local size = 0

    local labels = {}

    local function writeByte( byte )
        size = size + 1
        machineCode[size] = byte
    end

    for line in strCode:gmatch('[^\r\n]+') do
        line = line:match('^%s*(.-)%s*$') -- 去掉前后空格
        if not line or line == '' then -- 空行
            goto next_line
        end
        if line:sub(1,1) == ';' then -- 整行注释
            goto next_line
        end

        local cmd = line:match('(%S+)%s*:') -- 标签
        if cmd then -- 检测到标签
            log.debug('label: ' .. cmd)
            labels[cmd] = self.eip + size + 1
            goto next_line
        end

        local cmd, args = line:match('(%S+)%s+(.+)')
        if not cmd then -- 语法错误
            table.insert(msg, 'Syntax error: ' .. line)
            errorCount = errorCount + 1
            goto next_line
        end

        local code = self[cmd]
        if not code then
            table.insert(msg, 'Unknown command: ' .. cmd)
            errorCount = errorCount + 1
            goto next_line
        end

        -- 处理参数末尾可能携带的注释
        local args, c = args:gsub(';.*$', '')
        if c ~= 0 then -- 有注释
            args = args:match('^%s*(.-)%s*$') -- 去掉前后空格  mov eax, 0x12345678 ; 注释
        end

        local table_params = {}
        local i = 0
        args = args:gsub( '[^,]+', function(v)
            v = v:match('^%s*(.-)%s*$') -- 去掉参数前后空格
            i = i + 1
            table_params[i] = v
            return v
        end)

        local label_flag = false
        -- 检测支持标签的指令
        if cmd == 'jmp' or cmd == 'je' or cmd == 'jne' then
            if not labels[table_params[1]] then -- 标签不存在，有可能标签在后面定义
                
                label_flag = table_params[1] -- 保存标签名，后面再处理
                table_params[1] = 0x12345678
            else
                table_params[1] = labels[table_params[1]] - size - 1
            end
        end

        --local ret = code(self, table_unpack(table_params))
        local suc, ret = xpcall( code, error, self, table_unpack(table_params) )
        if not ret then
            table.insert(msg, 'Unknown error: ' .. cmd .. ' ' .. args)
            errorCount = errorCount + 1
            goto next_line
        end

        local cur = 1
        while true do
            local byte = ret[cur]
            if not byte then
                break
            end
            cur = cur + 1
            writeByte( byte )
        end

        if label_flag then
            machineCode[size - 3] = label_flag
        end

        ::next_line::
    end
    local str = ''
    for i = 1, size, 1 do
        local byte = machineCode[i]
        if type(byte) == 'string' then
            if not labels[byte] then
                table.insert(msg, 'Unknown label: ' .. byte)
                errorCount = errorCount + 1
                goto next
            end
            local offset = labels[byte] - i - 4
            machineCode[i] =  (offset >> 0) & 0xff
            machineCode[i + 1] = (offset >> 8) & 0xff
            machineCode[i + 2] = (offset >> 16) & 0xff
            machineCode[i + 3] = (offset >> 24) & 0xff
            --local offset = labels[byte] - i
            --machineCode[i] =  (offset >> 24) % 256
            --machineCode[i + 1] = (offset >> 16) % 256
            --machineCode[i + 2] = (offset >> 8) % 256
            --machineCode[i + 3] = (offset % 256)
        end
        str = str .. ('%X'):format(machineCode[i]) .. ' '
        ::next::
    end
    --log.debug('machine code: ' .. #str .. ' bytes: ' .. str )
    if errorCount > 0 then
        log.error('asm error: ' .. table.concat(msg, '\n'))
    end
    return machineCode, size
end

return mt