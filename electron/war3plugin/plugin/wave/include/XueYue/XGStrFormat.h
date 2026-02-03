
#  //define XG_StrFormat_Reg(key, format) <?=XG_StrFormat_Reg_Lua(key,[==[format]==])?>
#  //define XG_StrFormat_AIO(str) <?=XG_StrFormat_AIO_Lua(str)?>
#  //define XG_StrFormat_Do(str, format) <?=XG_StrFormat_Do_Lua(str, format)?>

//call XG_StrFormat_Reg( "atk", R2S( (LoadReal(YDLOC, GetHandleId(GetTriggeringTrigger())*ydl_localvar_step, <?=StringHash( "f")?>) * LoadReal(YDLOC, GetHandleId(GetTriggeringTrigger())*ydl_localvar_step, <?=StringHash( "value")?>))))
