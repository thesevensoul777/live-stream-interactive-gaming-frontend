require 'ffi.hCore'

package.loaded['ffi.unicode'] = nil
require 'ffi.unicode'

function getCDATA_pointer( cdata )
        return tonumber( tostring(cdata):match('>: (%x*)') or '0', 16 )
end