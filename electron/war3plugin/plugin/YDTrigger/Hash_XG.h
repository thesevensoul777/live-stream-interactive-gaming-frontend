# /*
#  *  局部变量、自定义值
#  *  
#  *  By actboy168
#  *
#  */
#
#ifndef INCLUDE_YDTRIGGER_HASH_H
#define INCLUDE_YDTRIGGER_HASH_H

# include "XueYue\SystemLibs\YDTrigger\pool.j"

#define YDUserDataClearTable(table_type, table) YDHashClearTable(YDHASH_HANDLE, YDHashAny2I(table_type, table))
#define YDUserDataClear(table_type, table, attribute, value_type) YDHashClear(YDHASH_HANDLE, value_type, YDHashAny2I(table_type, table), <?=StringHash(attribute)?>)
#define YDUserDataSet(table_type, table, attribute, value_type, value) YDHashSet(YDHASH_HANDLE, value_type, YDHashAny2I(table_type, table), <?=StringHash(attribute)?>, value)
#define YDUserDataGet(table_type, table, attribute, value_type) YDHashGet(YDHASH_HANDLE, value_type, YDHashAny2I(table_type, table), <?=StringHash(attribute)?>)
#define YDUserDataHas(table_type, table, attribute, value_type) YDHashHas(YDHASH_HANDLE, value_type, YDHashAny2I(table_type, table), <?=StringHash(attribute)?>)
#
#define YD_hTrig GetHandleId( GetTriggeringTrigger() )
#define stackIdx XG_YDTrigger_StackIdx
#   // 傻逼逆天。是真的逆天，处处偷懒、回调里就不能放个init宏。
#  //等待都知道加个重置step。运行逆天就不知道。写尼玛那么复杂handle乘算。handleid也不加个局部存，就尼玛每条都get一下。一点代码不优化
#
#  // GlobalsTriggerRunSteps & TriggerRunSteps
#  //双栈 
#  //函数的栈用来管理主要索引
#  //表的栈用来兼容套娃和 逆大天 的运行逆天触发器。

#  //不兼容 套娃+等待 两个毒瘤同时出现
#define YDLocalInitialize() \
    local integer ydl_localvar_step = XG_YDLocalIndex_Alloc() YDNL \
    call YDHashSet(YDLOC, integer, YD_hTrig, -1, YDHashGet( YDLOC, integer, YD_hTrig, -1 ) + 1 ) YDNL \
    call YDHashSet(YDLOC, integer, YD_hTrig, YDHashGet( YDLOC, integer, YD_hTrig, -1 ), ydl_localvar_step)


//当被等待拦截后，会调用重置step为当前触发器的step
#define YDLocalReset()                             YDHashSet(YDLOC, integer, YD_hTrig, YDHashGet( YDLOC, integer, YD_hTrig, -1 ), ydl_localvar_step)

# // 1. 第一层 原始触发器 局部
#define YDLOCAL_1                                  ydl_localvar_step
#define YDLocal1Set(type, name, value)             YDHashSet(YDLOC, type, YDLOCAL_1, <?=StringHash(name)?>, value)
#define YDLocal1ArraySet(type, name, index, value) YDHashSet(YDLOC, type, YDLOCAL_1, <?=StringHash(name)?> + (index), value)
#define YDLocal1Get(type, name)                    YDHashGet(YDLOC, type, YDLOCAL_1, <?=StringHash(name)?>)
#define YDLocal1ArrayGet(type, name, index)        YDHashGet(YDLOC, type, YDLOCAL_1, <?=StringHash(name)?> + (index))
#define YDLocal1Release() YDHashClearTable(YDLOC, YDLOCAL_1) YDNL \
call XG_YDLocalIndex_Release( YDLOCAL_1 )  YDNL \
call YDHashSet(YDLOC, integer, YD_hTrig, -1, YDHashGet( YDLOC, integer, YD_hTrig, -1 ) - 1 ) 


//YDHashGet(YDLOC, integer, 0, -1) ydl_triggerstep
# // 2. 逆天运行触发器 传参[当触发器内没有使用局部时不使用 YDLOCAL_1 转而使用 YDLOCAL_2 ]
# // 条件/回调 内使用逆天局部也会用这个所以不能直接用 ydl_triggerstep
#define YDLOCAL_2                                  YDHashGet(YDLOC, integer, YD_hTrig, YDHashGet( YDLOC, integer, YD_hTrig, -1 ))
#define YDLocal2Set(type, name, value)             YDHashSet(YDLOC, type, YDLOCAL_2, <?=StringHash(name)?>, value)
#define YDLocal2ArraySet(type, name, index, value) YDHashSet(YDLOC, type, YDLOCAL_2, <?=StringHash(name)?> + (index), value)
#define YDLocal2Get(type, name)                    YDHashGet(YDLOC, type, YDLOCAL_2, <?=StringHash(name)?>)
#define YDLocal2ArrayGet(type, name, index)        YDHashGet(YDLOC, type, YDLOCAL_2, <?=StringHash(name)?> + (index))


# // 3. 动态注册计时器
#define YDLOCAL_3                                  YDHashH2I(GetExpiredTimer())
#define YDLocal3Set(type, name, value)             YDHashSet(YDLOC, type, YDLOCAL_3, <?=StringHash(name)?>, value)
#define YDLocal3ArraySet(type, name, index, value) YDHashSet(YDLOC, type, YDLOCAL_3, <?=StringHash(name)?> + (index), value)
#define YDLocal3Get(type, name)                    YDHashGet(YDLOC, type, YDLOCAL_3, <?=StringHash(name)?>)
#define YDLocal3ArrayGet(type, name, index)        YDHashGet(YDLOC, type, YDLOCAL_3, <?=StringHash(name)?> + (index))
#define YDLocal3Release()                          YDHashClearTable(YDLOC, YDLOCAL_3)


# // 4. 动态注册触发器
#define YDLOCAL_4                                  YDHashH2I(GetTriggeringTrigger())
#define YDLocal4Set(type, name, value)             YDHashSet(YDLOC, type, YDLOCAL_4, <?=StringHash(name)?>, value)
#define YDLocal4ArraySet(type, name, index, value) YDHashSet(YDLOC, type, YDLOCAL_4, <?=StringHash(name)?> + (index), value)
#define YDLocal4Get(type, name)                    YDHashGet(YDLOC, type, YDLOCAL_4, <?=StringHash(name)?>)
#define YDLocal4ArrayGet(type, name, index)        YDHashGet(YDLOC, type, YDLOCAL_4, <?=StringHash(name)?> + (index))
#define YDLocal4Release()                          YDHashClearTable(YDLOC, YDLOCAL_4)

//逆天运行触发器 参数挂接到目标触发器局部
//提前注册 triggerstep 再释放，即将运行的触发器会注册到相同索引，达到挂接参数的目的
//禁止在逆天触发器传参中使用等待！
#define YDLocalExecuteTrigger(trg) \
    set ydl_triggerstep = XG_YDLocalIndex_Alloc() YDNL \
    call XG_YDLocalIndex_Release(ydl_triggerstep) YDNL \

    //由于运行的目标触发器会将 0, 0 更新为新索引
    //call YDHashSet(YDLOC, integer, 0, 0, ydl_localvar_step) YDNL \

// YDNL \
//    call YDHashSet(YDLOC, integer, 0, 0, ydl_triggerstep)

# // 5. callback内运行触发器
#define YDLOCAL_5                                  ydl_triggerstep
#define YDLocal5Set(type, name, value)             YDHashSet(YDLOC, type, YDLOCAL_5, <?=StringHash(name)?>, value)
#define YDLocal5ArraySet(type, name, index, value) YDHashSet(YDLOC, type, YDLOCAL_5, <?=StringHash(name)?> + (index), value)
#define YDLocal5Get(type, name)                    YDHashGet(YDLOC, type, YDLOCAL_5, <?=StringHash(name)?>)
#define YDLocal5ArrayGet(type, name, index)        YDHashGet(YDLOC, type, YDLOCAL_5, <?=StringHash(name)?> + (index))


# // 6.
#define YDLocal6Set(page, type, name, value)             YDHashSet(YDLOC, type, <?=StringHash(page)?>, <?=StringHash(name)?>, value)
#define YDLocal6ArraySet(page, type, name, index, value) YDHashSet(YDLOC, type, <?=StringHash(page)?>, <?=StringHash(name)?> + (index), value)
#define YDLocal6Get(page, type, name)                    YDHashGet(YDLOC, type, <?=StringHash(page)?>, <?=StringHash(name)?>)
#define YDLocal6ArrayGet(page, type, name, index)        YDHashGet(YDLOC, type, <?=StringHash(page)?>, <?=StringHash(name)?> + (index))
#define YDLocal6Release(page)                            YDHashClearTable(YDLOC, <?=StringHash(page)?>)


#
#define YDLocalSet(page, type, name, value)             YDHashSet(YDLOC, type, YDHashH2I(page), <?=StringHash(name)?>, value)
#define YDLocalArraySet(page, type, name, index, value) YDHashSet(YDLOC, type, YDHashH2I(page), <?=StringHash(name)?> + (index), value)
#define YDLocalGet(page, type, name)                    YDHashGet(YDLOC, type, YDHashH2I(page), <?=StringHash(name)?>)
#define YDLocalArrayGet(page, type, name, index)        YDHashGet(YDLOC, type, YDHashH2I(page), <?=StringHash(name)?> + (index))
#define YDLocalRelease(page)                            YDHashClearTable(YDLOC, YDHashH2I(page))

#
#define KKWESetUserData(table_type, table, keytype1,valuetype1, valuetype, value) YDHashSet(YDHASH_HANDLE, valuetype, YDHashAny2I(table_type, table), YDHashAny2I(keytype1, valuetype1), value)
#define KKWEGetUserData(table_type, table, keytype1, valuetype1, valuetype) YDHashGet(YDHASH_HANDLE, valuetype, YDHashAny2I(table_type, table), YDHashAny2I(keytype1, valuetype1))
#define KKWEClearUserData(table_type, table, keytype1, valuetype1, value_type) YDHashClear(YDHASH_HANDLE, value_type, YDHashAny2I(table_type, table), YDHashAny2I(keytype1, valuetype1))
#
#
#endif
