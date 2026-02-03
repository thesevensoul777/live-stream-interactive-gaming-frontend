library cjLib75hJKJ374s4e597nba9o7w45gf
globals
group cj_tmpgr_copy_nw509ert7
endglobals
function cj_group_copy_75hJKJ3745gf takes nothing returns nothing
//# optional
call GroupAddUnit(cj_tmpgr_copy_nw509ert7,GetEnumUnit())
endfunction
endlibrary
library cjLibw560nbs9b8nse46703948 initializer init
globals
boolexpr cj_true_bool_4896bnao87
endglobals
function cj_true_a497bnsor7 takes nothing returns boolean
//# optional
return true
endfunction
private function init takes nothing returns nothing
set cj_true_bool_4896bnao87=Condition(function cj_true_a497bnsor7)
endfunction
endlibrary
globals
integer udg_UDex=0
integer array udg_UnitIndexLock
integer array udg_UDexPrev
integer array udg_UDexNext
real udg_UnitIndexEvent=0
unit array udg_UDexUnits
integer udg_UDexRecycle=0
boolean udg_UnitIndexerEnabled=false
integer udg_UDexWasted=0
integer udg_UDexGen=0
integer udg_DamageBlockingAbility=0
integer udg_SpellDamageAbility=0
integer udg_DamageTypeExplosive=0
integer udg_DamageTypeCriticalStrike=0
integer udg_DamageTypeHeal=0
integer udg_DamageTypeReduced=0
integer udg_DamageTypeBlocked=0
integer udg_DmgEvBracers=0
real udg_DAMAGE_FACTOR_BRACERS=0
real udg_DAMAGE_FACTOR_ELUNES=0
real udg_DAMAGE_FACTOR_ETHEREAL=0
integer udg_DamageEventAOE=0
integer udg_DamageEventLevel=0
real udg_AfterDamageEvent=0
real udg_DamageEvent=0
real udg_AOEDamageEvent=0
real udg_DamageModifierEvent=0
trigger udg_ClearDamageEvent=null
real udg_DamageEventAmount=0
real udg_DamageEventPrevAmt=0
boolean udg_DamageEventOverride=false
boolean udg_NextDamageOverride=false
unit udg_DamageEventSource=null
unit udg_DamageEventTarget=null
trigger udg_DamageEventTrigger=null
trigger udg_DmgEvTrig=null
integer udg_DamageEventType=0
integer array udg_LastDmgPrevType
integer udg_NextDamageType=0
integer udg_DamageEventsWasted=0
integer udg_DmgEvRecursionN=0
boolean udg_DmgEvRunning=false
boolean udg_DmgEvStarted=false
boolean udg_IsDamageSpell=false
boolean array udg_LastDmgWasSpell
real udg_LastDamageHP=0
timer udg_DmgEvTimer=null
real array udg_LastDmgPrevAmount
real array udg_LastDmgValue
unit array udg_LastDmgSource
unit array udg_LastDmgTarget
boolean array udg_HideDamageFrom
boolean array udg_UnitDamageRegistered
unit udg_EnhancedDamageTarget=null
group udg_DamageEventAOEGroup=null
hashtable udg_HeroUIHash=null
trigger gg_trg_Unit_Indexer=null
trigger gg_trg_Damage_Engine_Config=null
trigger gg_trg_Damage_Engine=null
trigger gg_trg_GlobalData=null
trigger gg_trg_HeroDeathSystem=null
trigger gg_trg_AutoSummonerSystem=null
trigger gg_trg_BottomNotifySystem=null
trigger gg_trg_ScrollingMsgSystem=null
trigger gg_trg_WriteSummary_u=null
trigger gg_trg_GiftBagSystem=null
trigger gg_trg_GlobalHeroTitle=null
trigger gg_trg_GameEndSystem=null
trigger gg_trg_TopMsgSystem=null
trigger gg_trg_HeroUIManager=null
trigger gg_trg_UISystem=null
trigger gg_trg_TreeRespawnSystem=null
trigger gg_trg_AutoSpawnSystem=null
trigger gg_trg_WellResourceSystem=null
trigger gg_trg_AdminPrivilegeInit=null
trigger gg_trg_LockCamera=null
trigger gg_trg_InitCamere=null
trigger gg_trg_RewardSystem=null
trigger gg_trg_HarvestGlobalSystem=null
trigger gg_trg_WorkerSystem=null
trigger gg_trg_CommonFunc=null
trigger gg_trg_Files_IO=null
trigger gg_trg_SummonerManager=null
trigger gg_trg_AutoSummon=null
trigger gg_trg_SummonCore=null
trigger gg_trg_initReadLike=null
trigger gg_trg_initReadGift=null
trigger gg_trg_initReadAction=null
trigger gg_trg_Demonstration=null
trigger gg_trg_GlobalBuildingSystem=null
trigger gg_trg_FixAllGoldMines=null
trigger gg_trg_SystemTestModule=null
trigger gg_trg_AutoLevelUp=null
trigger gg_trg_Endtest=null
trigger gg_trg_TestResourceSystem=null
endglobals
function InitGlobals takes nothing returns nothing
local integer i=0
set udg_UDex=0
set i=0
loop
exitwhen      (i>1)
set udg_UnitIndexLock[i]=0
set i=i+1
endloop
set i=0
loop
exitwhen      (i>1)
set udg_UDexPrev[i]=0
set i=i+1
endloop
set i=0
loop
exitwhen      (i>1)
set udg_UDexNext[i]=0
set i=i+1
endloop
set udg_UnitIndexEvent=0
set udg_UDexRecycle=0
set udg_UnitIndexerEnabled=false
set udg_UDexWasted=0
set udg_UDexGen=0
set udg_DamageTypeExplosive=0
set udg_DamageTypeCriticalStrike=0
set udg_DamageTypeHeal=0
set udg_DamageTypeReduced=0
set udg_DamageTypeBlocked=0
set udg_DAMAGE_FACTOR_BRACERS=0
set udg_DAMAGE_FACTOR_ELUNES=0
set udg_DAMAGE_FACTOR_ETHEREAL=0
set udg_DamageEventAOE=0
set udg_DamageEventLevel=0
set udg_AfterDamageEvent=0
set udg_DamageEvent=0
set udg_AOEDamageEvent=0
set udg_DamageModifierEvent=0
set udg_DamageEventAmount=0
set udg_DamageEventPrevAmt=0
set udg_DamageEventOverride=false
set udg_NextDamageOverride=false
set udg_DamageEventType=0
set i=0
loop
exitwhen      (i>1)
set udg_LastDmgPrevType[i]=0
set i=i+1
endloop
set udg_NextDamageType=0
set udg_DamageEventsWasted=0
set udg_DmgEvRecursionN=0
set udg_DmgEvRunning=false
set udg_DmgEvStarted=false
set udg_IsDamageSpell=false
set i=0
loop
exitwhen      (i>1)
set udg_LastDmgWasSpell[i]=false
set i=i+1
endloop
set udg_LastDamageHP=0
set udg_DmgEvTimer=CreateTimer()
set i=0
loop
exitwhen      (i>1)
set udg_LastDmgPrevAmount[i]=0
set i=i+1
endloop
set i=0
loop
exitwhen      (i>1)
set udg_LastDmgValue[i]=0
set i=i+1
endloop
set i=0
loop
exitwhen      (i>1)
set udg_HideDamageFrom[i]=false
set i=i+1
endloop
set i=0
loop
exitwhen      (i>1)
set udg_UnitDamageRegistered[i]=false
set i=i+1
endloop
set udg_DamageEventAOEGroup=CreateGroup()
endfunction
function CreateBuildingsForPlayer0 takes nothing returns nothing
local player p=Player(0)
local unit u
local integer unitID
local trigger t
local real life
set u=CreateUnit(p,0x65616F6D,-2048.0,-1024.0,270.000)
set u=CreateUnit(p,0x65616F6D,-2048.0,1024.0,270.000)
set u=CreateUnit(p,0x6E686562,-2560.0,64.0,270.000)
set u=CreateUnit(p,0x656D6F77,-2080.0,-480.0,270.000)
set u=CreateUnit(p,0x65616F6D,-2048.0,0.0,270.000)
set u=CreateUnit(p,0x656D6F77,-2080.0,544.0,270.000)
set u=CreateUnit(p,0x6E636177,-2496.0,-640.0,270.000)
set u=CreateUnit(p,0x6E636177,-2560.0,512.0,270.000)
endfunction
function CreateUnitsForPlayer0 takes nothing returns nothing
local player p=Player(0)
local unit u
local integer unitID
local trigger t
local real life
set u=CreateUnit(p,0x65747270,-1534.7,1020.7,304.188)
set u=CreateUnit(p,0x65747270,-1535.6,1531.9,353.012)
set u=CreateUnit(p,0x65747270,-1530.9,515.9,295.146)
set u=CreateUnit(p,0x65747270,-1547.4,15.0,247.431)
set u=CreateUnit(p,0x65747270,-1535.6,-1028.1,353.012)
set u=CreateUnit(p,0x65747270,-1534.7,-1539.3,304.188)
set u=CreateUnit(p,0x65747270,-1534.7,-510.7,261.120)
endfunction
function CreateBuildingsForPlayer1 takes nothing returns nothing
local player p=Player(1)
local unit u
local integer unitID
local trigger t
local real life
set u=CreateUnit(p,0x68626172,2048.0,-1024.0,270.000)
set u=CreateUnit(p,0x68626172,2048.0,1024.0,270.000)
set u=CreateUnit(p,0x68677477,1536.0,1024.0,270.000)
set u=CreateUnit(p,0x68677477,1536.0,512.0,270.000)
set u=CreateUnit(p,0x6E656774,2560.0,-512.0,270.000)
set u=CreateUnit(p,0x6E656774,2560.0,512.0,270.000)
set u=CreateUnit(p,0x68686F75,2048.0,-512.0,270.000)
set u=CreateUnit(p,0x68677477,1536.0,-1536.0,270.000)
set u=CreateUnit(p,0x68677477,1536.0,-1024.0,270.000)
set u=CreateUnit(p,0x68677477,1536.0,0.0,270.000)
set u=CreateUnit(p,0x68677477,1536.0,-512.0,270.000)
set u=CreateUnit(p,0x68677477,1536.0,1536.0,270.000)
set u=CreateUnit(p,0x68626172,2048.0,0.0,270.000)
set u=CreateUnit(p,0x68686F75,2048.0,512.0,270.000)
set u=CreateUnit(p,0x6E676F62,2560.0,0.0,270.000)
endfunction
function CreateNeutralPassiveBuildings takes nothing returns nothing
local player p=Player(PLAYER_NEUTRAL_PASSIVE)
local unit u
local integer unitID
local trigger t
local real life
set u=CreateUnit(p,0x6E627365,-3296.0,-1312.0,270.000)
set u=CreateUnit(p,0x6E676F6C,-64.0,1216.0,270.000)
call SetResourceAmount(u,1000000)
set u=CreateUnit(p,0x6E637033,3328.0,1280.0,270.000)
set u=CreateUnit(p,0x6E637033,3328.0,768.0,270.000)
set u=CreateUnit(p,0x6E637033,3328.0,256.0,270.000)
set u=CreateUnit(p,0x6E637033,3328.0,-256.0,270.000)
set u=CreateUnit(p,0x6E637033,3328.0,-768.0,270.000)
set u=CreateUnit(p,0x6E637033,3328.0,-1280.0,270.000)
set u=CreateUnit(p,0x6E627365,-3296.0,-800.0,270.000)
set u=CreateUnit(p,0x6E627365,-3296.0,-288.0,270.000)
set u=CreateUnit(p,0x6E627365,-3296.0,1248.0,270.000)
set u=CreateUnit(p,0x6E627365,-3296.0,736.0,270.000)
set u=CreateUnit(p,0x6E627365,-3296.0,224.0,270.000)
set u=CreateUnit(p,0x6E676F6C,-64.0,320.0,270.000)
call SetResourceAmount(u,1000000)
set u=CreateUnit(p,0x6E676F6C,256.0,1216.0,270.000)
call SetResourceAmount(u,1000000)
set u=CreateUnit(p,0x6E676F6C,256.0,320.0,270.000)
call SetResourceAmount(u,1000000)
endfunction
function CreatePlayerBuildings takes nothing returns nothing
call CreateBuildingsForPlayer0()
call CreateBuildingsForPlayer1()
endfunction
function CreatePlayerUnits takes nothing returns nothing
call CreateUnitsForPlayer0()
endfunction
function CreateAllUnits takes nothing returns nothing
call CreateNeutralPassiveBuildings()
call CreatePlayerBuildings()
call CreatePlayerUnits()
endfunction
function Trig_Unit_IndexerActions takes nothing returns nothing
call ExecuteFunc("InitializeUnitIndexer")
endfunction
function ClearUnitIndex takes nothing returns nothing
if            ((GetUnitUserData(udg_UDexUnits[udg_UDex])==0))then
set udg_UnitIndexLock[udg_UDex]=(udg_UnitIndexLock[udg_UDex]-1)
if            ((udg_UnitIndexLock[udg_UDex]==0))then
set udg_UDexNext[udg_UDexPrev[udg_UDex]]=udg_UDexNext[udg_UDex]
set udg_UDexPrev[udg_UDexNext[udg_UDex]]=udg_UDexPrev[udg_UDex]
set udg_UDexPrev[udg_UDex]=0
set udg_UnitIndexEvent=0.00
set udg_UnitIndexEvent=2.00
set udg_UnitIndexEvent=0.00
set udg_UDexUnits[udg_UDex]=null
set udg_UDexNext[udg_UDex]=udg_UDexRecycle
set udg_UDexRecycle=udg_UDex
else
endif
else
endif
endfunction
function IndexUnit takes nothing returns boolean
local integer pdex=udg_UDex
local integer ndex
if            ((udg_UnitIndexerEnabled==true)and(GetUnitUserData(GetFilterUnit())==0))then
set udg_UDexWasted=(udg_UDexWasted+1)
if            ((udg_UDexWasted==32))then
set udg_UDexWasted=0
set udg_UDex=udg_UDexNext[0]
loop
exitwhen       udg_UDex==0
set ndex=udg_UDexNext[udg_UDex]
call ClearUnitIndex()
set udg_UDex=ndex
endloop
else
endif
if            ((udg_UDexRecycle==0))then
set udg_UDex=(udg_UDexGen+1)
set udg_UDexGen=udg_UDex
else
set udg_UDex=udg_UDexRecycle
set udg_UDexRecycle=udg_UDexNext[udg_UDex]
endif
set udg_UDexUnits[udg_UDex]=GetFilterUnit()
call SetUnitUserData(udg_UDexUnits[udg_UDex],udg_UDex)
set udg_UDexPrev[udg_UDexNext[0]]=udg_UDex
set udg_UDexNext[udg_UDex]=udg_UDexNext[0]
set udg_UDexNext[0]=udg_UDex
set udg_UnitIndexLock[udg_UDex]=1
set udg_UnitIndexEvent=0.00
set udg_UnitIndexEvent=1.00
set udg_UnitIndexEvent=0.00
set udg_UDex=pdex
else
endif
return         false
endfunction
function InitializeUnitIndexer takes nothing returns nothing
local integer i=bj_MAX_PLAYER_SLOTS
local boolexpr b=Filter(function IndexUnit)
local region re=CreateRegion()
local trigger t=GetTriggeringTrigger()
local rect r=GetWorldBounds()
call RegionAddRect(re,r)
call TriggerRegisterEnterRegion(t,re,b)
call TriggerClearActions(t)
call TriggerAddAction(t,function ClearUnitIndex)
set udg_UnitIndexerEnabled=true
loop
set i=i-1
call GroupEnumUnitsOfPlayer(bj_lastCreatedGroup,Player(i),b)
exitwhen       i==0
endloop
call RemoveRect(r)
set re=null
set r=null
set t=null
set b=null
set udg_UnitIndexEvent=3.00
set udg_UnitIndexEvent=0.00
endfunction
function InitTrig_Unit_Indexer takes nothing returns nothing
set gg_trg_Unit_Indexer=CreateTrigger()
call DoNothing()
call TriggerAddAction(gg_trg_Unit_Indexer,function Trig_Unit_IndexerActions)
endfunction
function Trig_Damage_Engine_ConfigActions takes nothing returns nothing
set udg_DamageBlockingAbility=0x41303031
set udg_SpellDamageAbility=0x41303030
set udg_DamageTypeExplosive=-1
set udg_DamageTypeCriticalStrike=1
set udg_DamageTypeHeal=2
set udg_DamageTypeReduced=3
set udg_DamageTypeBlocked=4
set udg_DAMAGE_FACTOR_BRACERS=0.67
set udg_DAMAGE_FACTOR_ELUNES=0.80
set udg_DAMAGE_FACTOR_ETHEREAL=1.67
set udg_DamageEventAOE=1
set udg_DamageEventLevel=1
endfunction
function InitTrig_Damage_Engine_Config takes nothing returns nothing
set gg_trg_Damage_Engine_Config=CreateTrigger()
call DoNothing()
call TriggerAddAction(gg_trg_Damage_Engine_Config,function Trig_Damage_Engine_ConfigActions)
endfunction
function DmgEvResetVars takes nothing returns nothing
local integer i=udg_DmgEvRecursionN-2
set udg_DmgEvRecursionN=i+1
if             i>=0 then
set udg_DamageEventPrevAmt=udg_LastDmgPrevAmount[i]
set udg_DamageEventAmount=udg_LastDmgValue[i]
set udg_DamageEventSource=udg_LastDmgSource[i]
set udg_DamageEventTarget=udg_LastDmgTarget[i]
set udg_IsDamageSpell=udg_LastDmgWasSpell[i]
set udg_DamageEventType=udg_LastDmgPrevType[i]
endif
endfunction
function CheckDamagedLifeEvent takes boolean clear returns nothing
if             clear then
set udg_NextDamageOverride=false
set udg_NextDamageType=0
endif
if             udg_DmgEvTrig!=null then
call DestroyTrigger(udg_DmgEvTrig)
set udg_DmgEvTrig=null
if             udg_IsDamageSpell then
call SetWidgetLife(udg_DamageEventTarget,RMaxBJ(udg_LastDamageHP,0.41))
if             udg_LastDamageHP<=0.405 then
if             udg_DamageEventType<0 then
call SetUnitExploded(udg_DamageEventTarget,true)
endif
call DisableTrigger(udg_DamageEventTrigger)
call UnitDamageTarget(udg_DamageEventSource,udg_DamageEventTarget,-999,false,false,null,DAMAGE_TYPE_UNIVERSAL,null)
call EnableTrigger(udg_DamageEventTrigger)
endif
elseif GetUnitAbilityLevel(udg_DamageEventTarget,udg_DamageBlockingAbility)>0 then
call UnitRemoveAbility(udg_DamageEventTarget,udg_DamageBlockingAbility)
call SetWidgetLife(udg_DamageEventTarget,udg_LastDamageHP)
endif
if             udg_DamageEventAmount!=0.00 and not udg_HideDamageFrom[GetUnitUserData(udg_DamageEventSource)]then
set udg_AfterDamageEvent=0.00
set udg_AfterDamageEvent=1.00
set udg_AfterDamageEvent=0.00
endif
call DmgEvResetVars()
endif
endfunction
function DmgEvOnAOEEnd takes nothing returns nothing
if             udg_DamageEventAOE>1 then
set udg_AOEDamageEvent=0.00
set udg_AOEDamageEvent=1.00
set udg_AOEDamageEvent=0.00
set udg_DamageEventAOE=1
endif
set udg_DamageEventLevel=1
set udg_EnhancedDamageTarget=null
call GroupClear(udg_DamageEventAOEGroup)
endfunction
function DmgEvOnExpire takes nothing returns nothing
set udg_DmgEvStarted=false
call CheckDamagedLifeEvent(true)
call DmgEvOnAOEEnd()
set udg_DamageEventTarget=null
set udg_DamageEventSource=null
endfunction
function PreCheckDamagedLifeEvent takes nothing returns boolean
call CheckDamagedLifeEvent(true)
return         false
endfunction
function OnUnitDamage takes nothing returns boolean
local boolean override=udg_DamageEventOverride
local integer i
local integer e=udg_DamageEventLevel
local integer a=udg_DamageEventAOE
local string s
local real prevAmount
local real life
local real prevLife
local unit u
local unit f
call CheckDamagedLifeEvent(false)
set i=udg_DmgEvRecursionN-1
if             i<0 then
set u=udg_DamageEventTarget
set f=udg_DamageEventSource
elseif i<16 then
set udg_LastDmgPrevAmount[i]=udg_DamageEventPrevAmt
set udg_LastDmgValue[i]=udg_DamageEventAmount
set udg_LastDmgSource[i]=udg_DamageEventSource
set udg_LastDmgTarget[i]=udg_DamageEventTarget
set udg_LastDmgWasSpell[i]=udg_IsDamageSpell
set udg_LastDmgPrevType[i]=udg_DamageEventType
else
set s="WARNING: Recursion error when dealing damage! Make sure when you deal damage from within a DamageEvent trigger, do it like this:\n\n"
set s=s+"Trigger - Turn off (This Trigger)\n"
set s=s+"Unit - Cause...\n"
set s=s+"Trigger - Turn on (This Trigger)"
call ClearTextMessages()
call DisplayTimedTextToPlayer(GetLocalPlayer(),0.00,0.00,999.00,s)
return         false
endif
set udg_DmgEvRecursionN=i+2
set prevAmount=GetEventDamage()
set udg_DamageEventTarget=GetTriggerUnit()
set udg_DamageEventSource=GetEventDamageSource()
set udg_DamageEventAmount=prevAmount
set udg_DamageEventType=udg_NextDamageType
set udg_NextDamageType=0
set udg_DamageEventOverride=udg_NextDamageOverride
set udg_NextDamageOverride=false
if             i<0 then
if             udg_DamageEventType==0 then
if             f==udg_DamageEventSource then
if             IsUnitInGroup(udg_DamageEventTarget,udg_DamageEventAOEGroup)then
set udg_DamageEventLevel=udg_DamageEventLevel+1
set udg_EnhancedDamageTarget=udg_DamageEventTarget
else
set udg_DamageEventAOE=udg_DamageEventAOE+1
endif
else
set u=udg_DamageEventSource
set udg_DamageEventSource=f
call DmgEvOnAOEEnd()
set udg_DamageEventSource=u
endif
call GroupAddUnit(udg_DamageEventAOEGroup,udg_DamageEventTarget)
endif
if             not udg_DmgEvStarted then
set udg_DmgEvStarted=true
call TimerStart(udg_DmgEvTimer,0.00,false,function DmgEvOnExpire)
endif
endif
if             prevAmount==0.00 then
if             not udg_HideDamageFrom[GetUnitUserData(udg_DamageEventSource)]then
set udg_DamageEventPrevAmt=0.00
set udg_DamageEvent=0.00
set udg_DamageEvent=2.00
set udg_DamageEvent=0.00
endif
call DmgEvResetVars()
else
set u=udg_DamageEventTarget
set udg_IsDamageSpell=prevAmount<0.00
if             udg_IsDamageSpell then
set prevAmount=-udg_DamageEventAmount
set life=1.00
if             IsUnitType(u,UNIT_TYPE_ETHEREAL)and not IsUnitType(u,UNIT_TYPE_HERO)then
set life=life*udg_DAMAGE_FACTOR_ETHEREAL
endif
if             GetUnitAbilityLevel(u,0x41656772)>0 then
set life=life*udg_DAMAGE_FACTOR_ELUNES
endif
if             udg_DmgEvBracers!=0 and IsUnitType(u,UNIT_TYPE_HERO)then
set i=6
loop
set i=i-1
if             GetItemTypeId(UnitItemInSlot(u,i))==udg_DmgEvBracers then
set life=life*udg_DAMAGE_FACTOR_BRACERS
exitwhen       true
endif
exitwhen       i==0
endloop
endif
set udg_DamageEventAmount=prevAmount*life
endif
set udg_DamageEventPrevAmt=prevAmount
set udg_DamageModifierEvent=0.00
if             not udg_DamageEventOverride then
set udg_DamageModifierEvent=1.00
if             not udg_DamageEventOverride then
set udg_DamageModifierEvent=2.00
set udg_DamageModifierEvent=3.00
endif
endif
set udg_DamageEventOverride=override
if             udg_DamageEventAmount>0.00 then
set udg_DamageModifierEvent=4.00
endif
set udg_DamageModifierEvent=0.00
if             not udg_HideDamageFrom[GetUnitUserData(udg_DamageEventSource)]then
set udg_DamageEvent=0.00
set udg_DamageEvent=1.00
set udg_DamageEvent=0.00
endif
call CheckDamagedLifeEvent(true)
set life=GetWidgetLife(u)
set udg_DmgEvTrig=CreateTrigger()
call TriggerAddCondition(udg_DmgEvTrig,Filter(function PreCheckDamagedLifeEvent))
if             not udg_IsDamageSpell then
if             udg_DamageEventAmount!=prevAmount then
set life=life+prevAmount-udg_DamageEventAmount
if             GetUnitState(u,UNIT_STATE_MAX_LIFE)<life then
set udg_LastDamageHP=life-prevAmount
call UnitAddAbility(u,udg_DamageBlockingAbility)
endif
call SetWidgetLife(u,RMaxBJ(life,0.42))
endif
call TriggerRegisterUnitStateEvent(udg_DmgEvTrig,u,UNIT_STATE_LIFE,LESS_THAN,RMaxBJ(0.41,life-prevAmount/2.00))
else
set udg_LastDamageHP=GetUnitState(u,UNIT_STATE_MAX_LIFE)
set prevLife=life
if             life+prevAmount*0.75>udg_LastDamageHP then
set life=RMaxBJ(udg_LastDamageHP-prevAmount/2.00,1.00)
call SetWidgetLife(u,life)
set life=(life+udg_LastDamageHP)/2.00
else
set life=life+prevAmount*0.50
endif
set udg_LastDamageHP=prevLife-(prevAmount-(prevAmount-udg_DamageEventAmount))
call TriggerRegisterUnitStateEvent(udg_DmgEvTrig,u,UNIT_STATE_LIFE,GREATER_THAN,life)
endif
endif
set u=null
set f=null
return         false
endfunction
function CreateDmgEvTrg takes nothing returns nothing
set udg_DamageEventTrigger=CreateTrigger()
call TriggerAddCondition(udg_DamageEventTrigger,Filter(function OnUnitDamage))
endfunction
function SetupDmgEv takes nothing returns boolean
local integer i=udg_UDex
local unit u
if             udg_UnitIndexEvent==1.00 then
set u=udg_UDexUnits[i]
if             GetUnitAbilityLevel(u,0x416C6F63)==0 and TriggerEvaluate(gg_trg_Damage_Engine_Config)then
set udg_UnitDamageRegistered[i]=true
call TriggerRegisterUnitEvent(udg_DamageEventTrigger,u,EVENT_UNIT_DAMAGED)
call UnitAddAbility(u,udg_SpellDamageAbility)
call UnitMakeAbilityPermanent(u,true,udg_SpellDamageAbility)
endif
set u=null
else
set udg_HideDamageFrom[i]=false
if             udg_UnitDamageRegistered[i]then
set udg_UnitDamageRegistered[i]=false
set udg_DamageEventsWasted=udg_DamageEventsWasted+1
if             udg_DamageEventsWasted==32 then
set udg_DamageEventsWasted=0
call DestroyTrigger(udg_DamageEventTrigger)
call CreateDmgEvTrg()
set i=udg_UDexNext[0]
loop
exitwhen       i==0
if             udg_UnitDamageRegistered[i]then
call TriggerRegisterUnitEvent(udg_DamageEventTrigger,udg_UDexUnits[i],EVENT_UNIT_DAMAGED)
endif
set i=udg_UDexNext[i]
endloop
endif
endif
endif
return         false
endfunction
function InitTrig_Damage_Engine takes nothing returns nothing
local unit u=CreateUnit(Player(bj_PLAYER_NEUTRAL_EXTRA),0x756C6F63,0,0,0)
local integer i=bj_MAX_PLAYERS
local trigger t=CreateTrigger()
call TriggerRegisterVariableEvent(t,"udg_UnitIndexEvent",EQUAL,1.00)
call TriggerRegisterVariableEvent(t,"udg_UnitIndexEvent",EQUAL,2.00)
call TriggerAddCondition(t,Filter(function SetupDmgEv))
set t=null
if             gg_trg_Damage_Engine_Config==null then
call ExecuteFunc("Trig_Damage_Engine_Config_Actions")
else
call TriggerExecute(gg_trg_Damage_Engine_Config)
endif
call CreateDmgEvTrg()
set udg_ClearDamageEvent=CreateTrigger()
call TriggerAddCondition(udg_ClearDamageEvent,Filter(function PreCheckDamagedLifeEvent))
loop
set i=i-1
call SetPlayerAbilityAvailable(Player(i),udg_SpellDamageAbility,false)
exitwhen       i==0
endloop
call UnitAddAbility(u,udg_DamageBlockingAbility)
call UnitAddAbility(u,udg_SpellDamageAbility)
call RemoveUnit(u)
set u=null
endfunction
library GlobalData requires cjLib75hJKJ374s4e597nba9o7w45gf,optional cjLibw560nbs9b8nse46703948
globals
public constant string team1="精灵阵容"
public constant string team2="人类阵容"
public constant real WF_FACING=0.0
public constant integer ID_WF_BASE=0x65746F6C
public constant integer ID_WF_WELL=0x656D6F77
public constant integer ID_WF_WAR=0x65616F6D
public constant integer ID_WF_TOWER=0x65747270
public constant integer ID_WF_BARRACKS=0x6E686562
public constant integer ID_KL_FARM=0x68686F75
public constant integer ID_KL_TOWER=0x68677477
public constant integer ID_KL_BAR=0x68626172
integer udg_WF_BarracksLevel=1
integer udg_WF_TowerLevel=1
integer udg_KL_BarracksLevel=1
integer udg_KL_TowerLevel=1
public constant integer ID_HERO_HUMAN=0x48303032
public constant integer ID_HERO_UNDEAD=0x55303030
public constant integer ID_HERO_ORC=0x4F303031
public constant integer ID_HERO_ELF=0x45303030
public constant real BASE_REVIVE_TIME=10.0
public constant integer ID_GOLD_MINE_TYPE=0x6E676F6C
public constant real KL_FACING=180.0
public constant integer ID_KL_BASE=0x68636173
integer udg_WellLevel=1
integer udg_BaseLevel=1
unit udg_WF_MainBase=null
unit udg_KL_MainBase=null
integer udg_WF_BaseLevel=1
integer udg_WF_WellLevel=1
integer udg_KL_BaseLevel=1
integer udg_KL_FarmLevel=1
unit udg_WF_WellUnit=null
unit udg_KL_FarmUnit=null
public constant integer ID_WF_MELEE=0x65666F6E
public constant integer ID_WF_RANGED=0x65617263
public constant integer ID_WF_WORKER=0x65777370
public constant integer ID_WF_ELITE=0x65646F63
public constant integer ID_WF_ULTI=0x6563686D
public constant integer ID_KL_MELEE=0x68666F6F
public constant integer ID_KL_RANGED=0x68726966
public constant integer ID_KL_WORKER=0x68706561
public constant integer ID_KL_SUPPORT=0x68736F72
public constant integer ID_KL_ULTI=0x68677279
public constant real TEAM1_TOP_X=-3800.0
public constant real TEAM1_TOP_Y=1000.0
public constant real TEAM1_MID_X=-3800.0
public constant real TEAM1_MID_Y=0
public constant real TEAM1_BOT_X=-3800.0
public constant real TEAM1_BOT_Y=-1000.0
public constant real TEAM2_TOP_X=3800.0
public constant real TEAM2_TOP_Y=1000.0
public constant real TEAM2_MID_X=3800.0
public constant real TEAM2_MID_Y=0
public constant real TEAM2_BOT_X=3800.0
public constant real TEAM2_BOT_Y=-1000.0
public constant real TOP_LEFT_GODLMINE_X=-100.0
public constant real TOP_LEFT_GODLMINE_Y=1250.0
public constant real MID_LEFT_GODLMINE_X=-100.0
public constant real MID_LEFT_GODLMINE_Y=300.0
public constant real TOP_Right_GODLMINE_X=0.0
public constant real TOP_Right_GODLMINE_Y=1250.0
public constant real MID_Right_GODLMINE_X=0.0
public constant real MID_Right_GODLMINE_Y=300.0
public constant real MID_TREE_X=-10.0
public constant real MID_TREE_Y=-522.0
public constant real BOTTOM_TREE_X=-10.0
public constant real BOTTOM_TREE_Y=-1400
public unit GoldMineTop=null
public unit GoldMineMid=null
public hashtable heroMap=InitHashtable()
public constant integer HT_ID_HASH=0
public constant integer HT_USER_NAME=1
public constant integer HT_SUMMONER_UNIT=2
public constant integer HT_TEAM=3
public constant integer HT_POS_TYPE=4
public constant integer HT_SCORE=10
public constant integer HT_RANK=11
public constant integer HT_KILLS=12
public constant integer HT_BATTLE_UNIT=30
public constant integer HT_BATTLE_LV=31
public constant integer HT_BATTLE_XP=32
public constant integer HT_BATTLE_STATUS=33
public constant integer HT_REVIVE_TICK=34
public constant integer HT_BONUS_STR=40
public constant integer HT_BONUS_AGI=41
public constant integer HT_BONUS_INT=42
public constant integer HT_BONUS_POINTS=43
public constant integer HT_INVENTORY_S1=50
public constant integer HT_INVENTORY_S2=51
public constant integer HT_INVENTORY_S3=52
public constant integer HT_INVENTORY_S4=53
public constant integer HT_INVENTORY_S5=54
public constant integer HT_INVENTORY_S6=55
public constant integer HT_PLAYER_INDEX_HASH=60
public constant integer HT_REF_ID_HASH=100
public constant integer HT_REF_MASTER=101
public constant integer HT_UNIT_TAG=102
public constant integer HT_TEXT_TAG_HANDLE=103
endglobals
endlibrary
library HeroDeathSystem initializer init requires cjLib75hJKJ374s4e597nba9o7w45gf,optional cjLibw560nbs9b8nse46703948,GlobalData
globals
private hashtable timerHt=InitHashtable()
endglobals
private function OnReviveTimerExpire takes nothing returns nothing
local timer t=GetExpiredTimer()
local integer tid=GetHandleId(t)
local integer idHash=LoadInteger(timerHt,tid,0)
local unit summoner
set summoner=LoadUnitHandle(GlobalData_heroMap,GlobalData_HT_SUMMONER_UNIT,idHash)
if             summoner!=null then
call SetPlayerAbilityAvailable(GetOwningPlayer(summoner),0x41303037,true)
call UnitResetCooldown(summoner)
else
call BJDebugMsg("|cffff0000[Error]|r 计时器结束但未找到召唤师 (idHash: "+I2S(idHash)+")")
endif
call FlushChildHashtable(timerHt,tid)
call DestroyTimer(t)
set t=null
set summoner=null
endfunction
private function OnHeroDeath takes nothing returns nothing
local unit dyingUnit=GetTriggerUnit()
local integer unitHandleId=GetHandleId(dyingUnit)
local integer tag=LoadInteger(GlobalData_heroMap,unitHandleId,GlobalData_HT_UNIT_TAG)
local integer idHash
local integer i
local item it
local timer t
if             tag==3 then
set idHash=LoadInteger(GlobalData_heroMap,GlobalData_HT_REF_ID_HASH,unitHandleId)
call SaveInteger(GlobalData_heroMap,idHash,GlobalData_HT_BATTLE_LV,GetHeroLevel(dyingUnit))
call SaveInteger(GlobalData_heroMap,idHash,GlobalData_HT_BATTLE_XP,GetHeroXP(dyingUnit))
set i=0
loop
exitwhen       i>5
set it=UnitItemInSlot(dyingUnit,i)
if             it!=null then
call SaveInteger(GlobalData_heroMap,idHash,GlobalData_HT_INVENTORY_S1+i,GetItemTypeId(it))
else
call SaveInteger(GlobalData_heroMap,idHash,GlobalData_HT_INVENTORY_S1+i,0)
endif
set i=i+1
endloop
call SaveInteger(GlobalData_heroMap,idHash,GlobalData_HT_BATTLE_STATUS,1)
set t=CreateTimer()
call SaveInteger(timerHt,GetHandleId(t),0,idHash)
call TimerStart(t,GlobalData_BASE_REVIVE_TIME,false,function OnReviveTimerExpire)
else
endif
set dyingUnit=null
set t=null
set it=null
endfunction
private function init takes nothing returns nothing
local trigger t=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(t,EVENT_PLAYER_UNIT_DEATH)
call TriggerAddAction(t,function OnHeroDeath)
set t=null
endfunction
endlibrary
library AutoSummonerSystem initializer init requires cjLib75hJKJ374s4e597nba9o7w45gf,optional cjLibw560nbs9b8nse46703948,GlobalData
globals
private constant real INTERVAL=0.4
private string array Orders
private integer OrderMax=0
private integer array AllSkillIDs
private integer SkillCount=0
private integer array ActiveIdHashes
private integer Count=0
endglobals
public function Register takes integer idHash returns nothing
set ActiveIdHashes[Count]=idHash
set Count=Count+1
endfunction
private function CastLoop takes nothing returns nothing
local integer i=0
local integer k
local integer j
local integer realHash
local unit u
local real x
local real y
local boolean isCastSuccess
loop
exitwhen       i>=Count
set realHash=ActiveIdHashes[i]
set u=LoadUnitHandle(GlobalData_heroMap,GlobalData_HT_SUMMONER_UNIT,realHash)
if             u!=null and UnitAlive(u)then
set x=GetUnitX(u)
set y=GetUnitY(u)
if             GetHeroSkillPoints(u)>0 then
set j=4
loop
exitwhen       j>=8
call SelectHeroSkill(u,AllSkillIDs[j])
set j=j+1
endloop
if             GetHeroSkillPoints(u)>0 then
set j=0
loop
exitwhen       j>=4
call SelectHeroSkill(u,AllSkillIDs[j])
set j=j+1
endloop
endif
set j=8
loop
exitwhen       j>=SkillCount
call SelectHeroSkill(u,AllSkillIDs[j])
set j=j+1
endloop
endif
set k=0
set isCastSuccess=false
loop
exitwhen       k>=OrderMax
if             IssueImmediateOrder(u,Orders[k])then
set isCastSuccess=true
elseif IssuePointOrder(u,Orders[k],x,y)then
set isCastSuccess=true
endif
if             isCastSuccess then
exitwhen       true
endif
set k=k+1
endloop
endif
set i=i+1
endloop
set u=null
endfunction
private function init takes nothing returns nothing
set Orders[0]="shockwave"
set Orders[1]="thunderclap"
set Orders[2]="stomp"
set Orders[3]="fanofknives"
set Orders[4]="carrionswarm"
set Orders[5]="starfall"
set OrderMax=6
set AllSkillIDs[0]=0x41303032
set AllSkillIDs[1]=0x41303041
set AllSkillIDs[2]=0x41303039
set AllSkillIDs[3]=0x41303038
set AllSkillIDs[4]=0x41303033
set AllSkillIDs[5]=0x4130304A
set AllSkillIDs[6]=0x41303043
set AllSkillIDs[7]=0x41303042
set AllSkillIDs[8]=0x41303034
set AllSkillIDs[9]=0x4130304B
set AllSkillIDs[10]=0x41303047
set AllSkillIDs[11]=0x41303044
set AllSkillIDs[12]=0x41303035
set AllSkillIDs[13]=0x4130304C
set AllSkillIDs[14]=0x41303048
set AllSkillIDs[15]=0x41303045
set AllSkillIDs[16]=0x41303036
set AllSkillIDs[17]=0x4130304D
set AllSkillIDs[18]=0x41303049
set AllSkillIDs[19]=0x41303046
set AllSkillIDs[20]=0x41616D6B
set SkillCount=21
call TimerStart(CreateTimer(),INTERVAL,true,function CastLoop)
endfunction
endlibrary
library BottomNotifySystem initializer init requires cjLib75hJKJ374s4e597nba9o7w45gf,optional cjLibw560nbs9b8nse46703948,GlobalData
globals
private integer array NotifyFrames
private real array NotifyTimers
private string array NotifyBaseMsgs
private integer MAX_NOTIFY=2
private real BOTTOM_Y=-0.15
private real LINE_HEIGHT=0.025
endglobals
public function AddBottomNotice takes string msg returns nothing
local integer i
if             NotifyFrames[1]!=0 then
call DzFrameShow(NotifyFrames[1],false)
endif
set NotifyFrames[1]=NotifyFrames[0]
set NotifyTimers[1]=NotifyTimers[0]
set NotifyBaseMsgs[1]=NotifyBaseMsgs[0]
if             NotifyFrames[1]!=0 then
call DzFrameSetPoint(NotifyFrames[1],4,DzGetGameUI(),4,0.0,BOTTOM_Y+LINE_HEIGHT)
call DzFrameSetText(NotifyFrames[1],"|cffffff00[事件]|r "+NotifyBaseMsgs[1]+"- 倒计时："+I2S(R2I(NotifyTimers[1])))
endif
set NotifyFrames[0]=DzCreateFrameByTagName("TEXT","BottomNotice",DzGetGameUI(),"template",0)
set NotifyBaseMsgs[0]=msg
set NotifyTimers[0]=29.0
call DzFrameSetText(NotifyFrames[0],"|cffffff00[事件]|r "+msg+" ：29")
call DzFrameSetPoint(NotifyFrames[0],4,DzGetGameUI(),4,0.0,BOTTOM_Y)
call DzFrameShow(NotifyFrames[0],true)
endfunction
private function UpdateTick takes nothing returns nothing
local integer i=0
loop
exitwhen       i>=MAX_NOTIFY
if             NotifyFrames[i]!=0 then
set NotifyTimers[i]=NotifyTimers[i]-0.5
if             NotifyTimers[i]<=0 then
call DzFrameShow(NotifyFrames[i],false)
set NotifyFrames[i]=0
else
call DzFrameSetText(NotifyFrames[i],"|cffffff00[事件]|r "+NotifyBaseMsgs[i]+" ："+I2S(R2I(NotifyTimers[i])))
endif
endif
set i=i+1
endloop
endfunction
private function init takes nothing returns nothing
call TimerStart(CreateTimer(),0.5,true,function UpdateTick)
endfunction
endlibrary
library ScrollingMsgSystem requires cjLib75hJKJ374s4e597nba9o7w45gf,optional cjLibw560nbs9b8nse46703948,GlobalData
globals
private integer array MsgFrames
private real array MsgTimers
private integer MAX_MSGS=6
private real START_Y=-0.1
private real LINE_HEIGHT=0.025
endglobals
public function AddScrollMsg takes string msg returns nothing
local integer i=MAX_MSGS-1
local integer newFrame
loop
exitwhen       i<0
if             MsgFrames[i]!=0 then
if             i==MAX_MSGS-1 then
call DzFrameShow(MsgFrames[i],false)
else
set MsgFrames[i+1]=MsgFrames[i]
set MsgTimers[i+1]=MsgTimers[i]
call DzFrameSetPoint(MsgFrames[i+1],4,DzGetGameUI(),4,0.0,START_Y+(i+1)*LINE_HEIGHT)
endif
endif
set i=i-1
endloop
set newFrame=DzCreateFrameByTagName("TEXT","ScrollMsg",DzGetGameUI(),"template",0)
call DzFrameSetText(newFrame,msg)
call DzFrameSetPoint(newFrame,4,DzGetGameUI(),4,0.0,START_Y)
call DzFrameShow(newFrame,true)
set MsgFrames[0]=newFrame
set MsgTimers[0]=5.0
endfunction
private function UpdateTick takes nothing returns nothing
local integer i=0
loop
exitwhen       i>=MAX_MSGS
if             MsgFrames[i]!=0 then
set MsgTimers[i]=MsgTimers[i]-0.1
if             MsgTimers[i]<=0 then
call DzFrameShow(MsgFrames[i],false)
set MsgFrames[i]=0
endif
endif
set i=i+1
endloop
endfunction
private function init takes nothing returns nothing
call TimerStart(CreateTimer(),0.1,true,function UpdateTick)
endfunction
endlibrary
function InitCustomTriggers takes nothing returns nothing
call InitTrig_Unit_Indexer()
call InitTrig_Damage_Engine_Config()
call InitTrig_Damage_Engine()
call InitTrig_GlobalData()
call InitTrig_HeroDeathSystem()
call InitTrig_AutoSummonerSystem()
call InitTrig_BottomNotifySystem()
call InitTrig_ScrollingMsgSystem()
endfunction
function RunInitializationTriggers takes nothing returns nothing
call ConditionalTriggerExecute(gg_trg_Unit_Indexer)
call ConditionalTriggerExecute(gg_trg_Damage_Engine)
call ConditionalTriggerExecute(gg_trg_GlobalData)
call ConditionalTriggerExecute(gg_trg_HeroDeathSystem)
call ConditionalTriggerExecute(gg_trg_BottomNotifySystem)
endfunction
function InitCustomPlayerSlots takes nothing returns nothing
call SetPlayerStartLocation(Player(0),0)
call ForcePlayerStartLocation(Player(0),0)
call SetPlayerColor(Player(0),ConvertPlayerColor(0))
call SetPlayerRacePreference(Player(0),RACE_PREF_NIGHTELF)
call SetPlayerRaceSelectable(Player(0),false)
call SetPlayerController(Player(0),MAP_CONTROL_COMPUTER)
call SetPlayerStartLocation(Player(1),1)
call ForcePlayerStartLocation(Player(1),1)
call SetPlayerColor(Player(1),ConvertPlayerColor(1))
call SetPlayerRacePreference(Player(1),RACE_PREF_HUMAN)
call SetPlayerRaceSelectable(Player(1),false)
call SetPlayerController(Player(1),MAP_CONTROL_COMPUTER)
call SetPlayerStartLocation(Player(2),2)
call ForcePlayerStartLocation(Player(2),2)
call SetPlayerColor(Player(2),ConvertPlayerColor(2))
call SetPlayerRacePreference(Player(2),RACE_PREF_ORC)
call SetPlayerRaceSelectable(Player(2),false)
call SetPlayerController(Player(2),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(3),3)
call ForcePlayerStartLocation(Player(3),3)
call SetPlayerColor(Player(3),ConvertPlayerColor(3))
call SetPlayerRacePreference(Player(3),RACE_PREF_UNDEAD)
call SetPlayerRaceSelectable(Player(3),false)
call SetPlayerController(Player(3),MAP_CONTROL_COMPUTER)
call SetPlayerStartLocation(Player(4),4)
call ForcePlayerStartLocation(Player(4),4)
call SetPlayerColor(Player(4),ConvertPlayerColor(4))
call SetPlayerRacePreference(Player(4),RACE_PREF_NIGHTELF)
call SetPlayerRaceSelectable(Player(4),false)
call SetPlayerController(Player(4),MAP_CONTROL_COMPUTER)
call SetPlayerStartLocation(Player(5),5)
call SetPlayerColor(Player(5),ConvertPlayerColor(5))
call SetPlayerRacePreference(Player(5),RACE_PREF_ORC)
call SetPlayerRaceSelectable(Player(5),false)
call SetPlayerController(Player(5),MAP_CONTROL_COMPUTER)
call SetPlayerStartLocation(Player(6),6)
call SetPlayerColor(Player(6),ConvertPlayerColor(6))
call SetPlayerRacePreference(Player(6),RACE_PREF_UNDEAD)
call SetPlayerRaceSelectable(Player(6),false)
call SetPlayerController(Player(6),MAP_CONTROL_COMPUTER)
call SetPlayerStartLocation(Player(7),7)
call SetPlayerColor(Player(7),ConvertPlayerColor(7))
call SetPlayerRacePreference(Player(7),RACE_PREF_NIGHTELF)
call SetPlayerRaceSelectable(Player(7),false)
call SetPlayerController(Player(7),MAP_CONTROL_COMPUTER)
call SetPlayerStartLocation(Player(8),8)
call SetPlayerColor(Player(8),ConvertPlayerColor(8))
call SetPlayerRacePreference(Player(8),RACE_PREF_HUMAN)
call SetPlayerRaceSelectable(Player(8),false)
call SetPlayerController(Player(8),MAP_CONTROL_COMPUTER)
endfunction
function InitCustomTeams takes nothing returns nothing
call SetPlayerTeam(Player(0),0)
call SetPlayerTeam(Player(1),0)
call SetPlayerTeam(Player(2),0)
call SetPlayerTeam(Player(3),0)
call SetPlayerTeam(Player(4),0)
call SetPlayerTeam(Player(5),0)
call SetPlayerTeam(Player(6),0)
call SetPlayerTeam(Player(7),0)
call SetPlayerTeam(Player(8),0)
endfunction
function main takes nothing returns nothing
call SetCameraBounds(-4224.0+GetCameraMargin(CAMERA_MARGIN_LEFT),-3072.0+GetCameraMargin(CAMERA_MARGIN_BOTTOM),4224.0-GetCameraMargin(CAMERA_MARGIN_RIGHT),3072.0-GetCameraMargin(CAMERA_MARGIN_TOP),-4224.0+GetCameraMargin(CAMERA_MARGIN_LEFT),3072.0-GetCameraMargin(CAMERA_MARGIN_TOP),4224.0-GetCameraMargin(CAMERA_MARGIN_RIGHT),-3072.0+GetCameraMargin(CAMERA_MARGIN_BOTTOM))
call SetDayNightModels("Environment\\DNC\\DNCLordaeron\\DNCLordaeronTerrain\\DNCLordaeronTerrain.mdl","Environment\\DNC\\DNCLordaeron\\DNCLordaeronUnit\\DNCLordaeronUnit.mdl")
call NewSoundEnvironment("Default")
call SetAmbientDaySound("LordaeronSummerDay")
call SetAmbientNightSound("LordaeronSummerNight")
call SetMapMusic("Music",true,0)
call CreateAllUnits()
call InitBlizzard()
call InitGlobals()
call InitCustomTriggers()
call RunInitializationTriggers()
endfunction
function config takes nothing returns nothing
call SetMapName("TRIGSTR_003")
call SetMapDescription("TRIGSTR_005")
call SetPlayers(9)
call SetTeams(9)
call SetGamePlacement(MAP_PLACEMENT_USE_MAP_SETTINGS)
call DefineStartLocation(0,768.0,-1664.0)
call DefineStartLocation(1,2368.0,192.0)
call DefineStartLocation(2,1984.0,-1920.0)
call DefineStartLocation(3,-896.0,192.0)
call DefineStartLocation(4,-768.0,1024.0)
call DefineStartLocation(5,1920.0,-768.0)
call DefineStartLocation(6,2048.0,-896.0)
call DefineStartLocation(7,-2304.0,0.0)
call DefineStartLocation(8,-2624.0,768.0)
call InitCustomPlayerSlots()
call InitCustomTeams()
endfunction
library BzAPI requires cjLib75hJKJ374s4e597nba9o7w45gf,optional cjLibw560nbs9b8nse46703948
native DzGetMouseTerrainX takes nothing returns real
native DzGetMouseTerrainY takes nothing returns real
native DzGetMouseTerrainZ takes nothing returns real
native DzIsMouseOverUI takes nothing returns boolean
native DzGetMouseX takes nothing returns integer
native DzGetMouseY takes nothing returns integer
native DzGetMouseXRelative takes nothing returns integer
native DzGetMouseYRelative takes nothing returns integer
native DzSetMousePos takes integer x,integer y returns nothing
native DzTriggerRegisterMouseEvent takes trigger trig,integer btn,integer status,boolean sync,string xfunc returns nothing
native DzTriggerRegisterMouseEventByCode takes trigger trig,integer btn,integer status,boolean sync,code xfuncHandle returns nothing
native DzTriggerRegisterKeyEvent takes trigger trig,integer key,integer status,boolean sync,string xfunc returns nothing
native DzTriggerRegisterKeyEventByCode takes trigger trig,integer key,integer status,boolean sync,code xfuncHandle returns nothing
native DzTriggerRegisterMouseWheelEvent takes trigger trig,boolean sync,string xfunc returns nothing
native DzTriggerRegisterMouseWheelEventByCode takes trigger trig,boolean sync,code xfuncHandle returns nothing
native DzTriggerRegisterMouseMoveEvent takes trigger trig,boolean sync,string xfunc returns nothing
native DzTriggerRegisterMouseMoveEventByCode takes trigger trig,boolean sync,code xfuncHandle returns nothing
native DzGetTriggerKey takes nothing returns integer
native DzGetWheelDelta takes nothing returns integer
native DzIsKeyDown takes integer iKey returns boolean
native DzGetTriggerKeyPlayer takes nothing returns player
native DzGetWindowWidth takes nothing returns integer
native DzGetWindowHeight takes nothing returns integer
native DzGetWindowX takes nothing returns integer
native DzGetWindowY takes nothing returns integer
native DzTriggerRegisterWindowResizeEvent takes trigger trig,boolean sync,string xfunc returns nothing
native DzTriggerRegisterWindowResizeEventByCode takes trigger trig,boolean sync,code xfuncHandle returns nothing
native DzIsWindowActive takes nothing returns boolean
native DzDestructablePosition takes destructable d,real x,real y returns nothing
native DzSetUnitPosition takes unit whichUnit,real x,real y returns nothing
native DzExecuteFunc takes string xfuncName returns nothing
native DzGetUnitUnderMouse takes nothing returns unit
native DzSetUnitTexture takes unit whichUnit,string path,integer texId returns nothing
native DzSetMemory takes integer address,real value returns nothing
native DzSetUnitID takes unit whichUnit,integer id returns nothing
native DzSetUnitModel takes unit whichUnit,string path returns nothing
native DzSetWar3MapMap takes string map returns nothing
native DzGetLocale takes nothing returns string
native DzGetUnitNeededXP takes unit whichUnit,integer level returns integer
native DzTriggerRegisterSyncData takes trigger trig,string prefix,boolean server returns nothing
native DzSyncData takes string prefix,string data returns nothing
native DzGetTriggerSyncPrefix takes nothing returns string
native DzGetTriggerSyncData takes nothing returns string
native DzGetTriggerSyncPlayer takes nothing returns player
native DzSyncBuffer takes string prefix,string data,integer dataLen returns nothing
native DzSyncDataImmediately takes string prefix,string data returns nothing
native DzFrameHideInterface takes nothing returns nothing
native DzFrameEditBlackBorders takes real upperHeight,real bottomHeight returns nothing
native DzFrameGetPortrait takes nothing returns integer
native DzFrameGetMinimap takes nothing returns integer
native DzFrameGetCommandBarButton takes integer row,integer column returns integer
native DzFrameGetHeroBarButton takes integer buttonId returns integer
native DzFrameGetHeroHPBar takes integer buttonId returns integer
native DzFrameGetHeroManaBar takes integer buttonId returns integer
native DzFrameGetItemBarButton takes integer buttonId returns integer
native DzFrameGetMinimapButton takes integer buttonId returns integer
native DzFrameGetUpperButtonBarButton takes integer buttonId returns integer
native DzFrameGetTooltip takes nothing returns integer
native DzFrameGetChatMessage takes nothing returns integer
native DzFrameGetUnitMessage takes nothing returns integer
native DzFrameGetTopMessage takes nothing returns integer
native DzGetColor takes integer r,integer g,integer b,integer a returns integer
native DzFrameSetUpdateCallback takes string xfunc returns nothing
native DzFrameSetUpdateCallbackByCode takes code xfuncHandle returns nothing
native DzFrameShow takes integer frame,boolean enable returns nothing
native DzCreateFrame takes string frame,integer parent,integer id returns integer
native DzCreateSimpleFrame takes string frame,integer parent,integer id returns integer
native DzDestroyFrame takes integer frame returns nothing
native DzLoadToc takes string fileName returns nothing
native DzFrameSetPoint takes integer frame,integer point,integer relativeFrame,integer relativePoint,real x,real y returns nothing
native DzFrameSetAbsolutePoint takes integer frame,integer point,real x,real y returns nothing
native DzFrameClearAllPoints takes integer frame returns nothing
native DzFrameSetEnable takes integer name,boolean enable returns nothing
native DzFrameSetScript takes integer frame,integer eventId,string xfunc,boolean sync returns nothing
native DzFrameSetScriptByCode takes integer frame,integer eventId,code xfuncHandle,boolean sync returns nothing
native DzGetTriggerUIEventPlayer takes nothing returns player
native DzGetTriggerUIEventFrame takes nothing returns integer
native DzFrameFindByName takes string name,integer id returns integer
native DzSimpleFrameFindByName takes string name,integer id returns integer
native DzSimpleFontStringFindByName takes string name,integer id returns integer
native DzSimpleTextureFindByName takes string name,integer id returns integer
native DzGetGameUI takes nothing returns integer
native DzClickFrame takes integer frame returns nothing
native DzSetCustomFovFix takes real value returns nothing
native DzEnableWideScreen takes boolean enable returns nothing
native DzFrameSetText takes integer frame,string text returns nothing
native DzFrameGetText takes integer frame returns string
native DzFrameSetTextSizeLimit takes integer frame,integer size returns nothing
native DzFrameGetTextSizeLimit takes integer frame returns integer
native DzFrameSetTextColor takes integer frame,integer color returns nothing
native DzGetMouseFocus takes nothing returns integer
native DzFrameSetAllPoints takes integer frame,integer relativeFrame returns boolean
native DzFrameSetFocus takes integer frame,boolean enable returns boolean
native DzFrameSetModel takes integer frame,string modelFile,integer modelType,integer flag returns nothing
native DzFrameGetEnable takes integer frame returns boolean
native DzFrameSetAlpha takes integer frame,integer alpha returns nothing
native DzFrameGetAlpha takes integer frame returns integer
native DzFrameSetAnimate takes integer frame,integer animId,boolean autocast returns nothing
native DzFrameSetAnimateOffset takes integer frame,real offset returns nothing
native DzFrameSetTexture takes integer frame,string texture,integer flag returns nothing
native DzFrameSetScale takes integer frame,real scale returns nothing
native DzFrameSetTooltip takes integer frame,integer tooltip returns nothing
native DzFrameCageMouse takes integer frame,boolean enable returns nothing
native DzFrameGetValue takes integer frame returns real
native DzFrameSetMinMaxValue takes integer frame,real minValue,real maxValue returns nothing
native DzFrameSetStepValue takes integer frame,real step returns nothing
native DzFrameSetValue takes integer frame,real value returns nothing
native DzFrameSetSize takes integer frame,real w,real h returns nothing
native DzCreateFrameByTagName takes string frameType,string name,integer parent,string template,integer id returns integer
native DzFrameSetVertexColor takes integer frame,integer color returns nothing
native DzOriginalUIAutoResetPoint takes boolean enable returns nothing
native DzFrameSetPriority takes integer frame,integer priority returns nothing
native DzFrameSetParent takes integer frame,integer parent returns nothing
native DzFrameGetHeight takes integer frame returns real
native DzFrameSetFont takes integer frame,string fileName,real height,integer flag returns nothing
native DzFrameGetParent takes integer frame returns integer
native DzFrameSetTextAlignment takes integer frame,integer align returns nothing
native DzFrameGetName takes integer frame returns string
native DzGetClientWidth takes nothing returns integer
native DzGetClientHeight takes nothing returns integer
native DzFrameIsVisible takes integer frame returns boolean
native DzFrameAddText takes integer frame,string text returns nothing
native DzUnitSilence takes unit whichUnit,boolean disable returns nothing
native DzUnitDisableAttack takes unit whichUnit,boolean disable returns nothing
native DzUnitDisableInventory takes unit whichUnit,boolean disable returns nothing
native DzUpdateMinimap takes nothing returns nothing
native DzUnitChangeAlpha takes unit whichUnit,integer alpha,boolean forceUpdate returns nothing
native DzUnitSetCanSelect takes unit whichUnit,boolean state returns nothing
native DzUnitSetTargetable takes unit whichUnit,boolean state returns nothing
native DzSaveMemoryCache takes string cache returns nothing
native DzGetMemoryCache takes nothing returns string
native DzSetSpeed takes real ratio returns nothing
native DzConvertWorldPosition takes real x,real y,real z,code callback returns boolean
native DzGetConvertWorldPositionX takes nothing returns real
native DzGetConvertWorldPositionY takes nothing returns real
native DzCreateCommandButton takes integer parent,string icon,string name,string desc returns integer
function DzTriggerRegisterMouseEventTrg takes trigger trg,integer status,integer btn returns nothing
if             trg==null then
return        
endif
call DzTriggerRegisterMouseEvent(trg,btn,status,true,null)
endfunction
function DzTriggerRegisterKeyEventTrg takes trigger trg,integer status,integer btn returns nothing
if             trg==null then
return        
endif
call DzTriggerRegisterKeyEvent(trg,btn,status,true,null)
endfunction
function DzTriggerRegisterMouseMoveEventTrg takes trigger trg returns nothing
if             trg==null then
return        
endif
call DzTriggerRegisterMouseMoveEvent(trg,true,null)
endfunction
function DzTriggerRegisterMouseWheelEventTrg takes trigger trg returns nothing
if             trg==null then
return        
endif
call DzTriggerRegisterMouseWheelEvent(trg,true,null)
endfunction
function DzTriggerRegisterWindowResizeEventTrg takes trigger trg returns nothing
if             trg==null then
return        
endif
call DzTriggerRegisterWindowResizeEvent(trg,true,null)
endfunction
function DzF2I takes integer i returns integer
return         i
endfunction
function DzI2F takes integer i returns integer
return         i
endfunction
function DzK2I takes integer i returns integer
return         i
endfunction
function DzI2K takes integer i returns integer
return         i
endfunction
function DzTriggerRegisterMallItemSyncData takes trigger trig returns nothing
call DzTriggerRegisterSyncData(trig,"DZMIA",true)
endfunction
function DzTriggerRegisterMallItemConsumeEvent takes trigger trig returns nothing
call DzTriggerRegisterSyncData(trig,"DZMIC",true)
endfunction
function DzTriggerRegisterMallItemRemoveEvent takes trigger trig returns nothing
call DzTriggerRegisterSyncData(trig,"DZMID",true)
endfunction
function DzGetTriggerMallItemPlayer takes nothing returns player
return         DzGetTriggerSyncPlayer()
endfunction
function DzGetTriggerMallItem takes nothing returns string
return         DzGetTriggerSyncData()
endfunction
endlibrary
library HcUnitAlive requires cjLib75hJKJ374s4e597nba9o7w45gf,optional cjLibw560nbs9b8nse46703948
native UnitAlive takes unit id returns boolean
endlibrary
library YDWEUnitHasItemOfTypeBJNull requires cjLib75hJKJ374s4e597nba9o7w45gf,optional cjLibw560nbs9b8nse46703948
function YDWEUnitHasItemOfTypeBJNull takes unit whichUnit,integer itemId returns boolean
local integer index=0
if             itemId!=0 then
loop
if             GetItemTypeId(UnitItemInSlot(whichUnit,index))==itemId then
return         true
endif
set index=index+1
exitwhen       index>=bj_MAX_INVENTORY
endloop
endif
return         false
endfunction
endlibrary
