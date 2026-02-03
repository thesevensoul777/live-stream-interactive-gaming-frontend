//Japi优化 - 字符串连接Lv3
    #ifdef YDWEOperatorString3
        #undef YDWEOperatorString3
    #endif
    #define YDWEOperatorString3(a1,a2,a3) XG_StringContact_Lv3( a1, a2, a3 )

//Japi优化 自动排泄系统
#define XG_LeakCollect_On           DoNothing
#define XG_LeakCollect_evt_dmg_On   DoNothing
#define XG_LeakCollect_Location_On  DoNothing
#define XG_LeakCollect_Group_On     DoNothing
#define XG_LeakCollect_Force_On     DoNothing
//#define XG_LeakCollect_PlayerEvent_On   DoNothing




