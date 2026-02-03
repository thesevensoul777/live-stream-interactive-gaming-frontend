#ifndef included_XGuserdataGC_h
#define included_XGuserdataGC_h

//手动排泄系统
# define _gc_unit() TriggerExecute( userdataGC__pocessUnit )
# define _gc_item() TriggerExecute( userdataGC__pocessItem )
# define _gc_bind_unit(lpCallback) Trigger##AddAction(userdataGC__pocessUnit, lpCallback)
# define _gc_bind_item(lpCallback) Trigger##AddAction(userdataGC__pocessItem, lpCallback)
# define _gc_remove_unit(lpCallback) TriggerRemoveAction(userdataGC__pocessUnit, lpCallback)
# define _gc_remove_item(lpCallback) TriggerRemoveAction(userdataGC__pocessItem, lpCallback)


#define gc_bind_unit(trig) <?= gc_bind_unit_lua([=[trig]=]) ?>
#define gc_bind_item(trig) <?= gc_bind_item_lua([=[trig]=]) ?>
#define TriggerAddAction(trig,action) <?= TriggerAddAction_lua([=[trig]=],[==[action]==]) ?>

#endif
