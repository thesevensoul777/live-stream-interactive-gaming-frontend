// useDanmuStore.ts
import { ref } from 'vue'
import type { DyMessage } from '@/core/dycast'

const allCasts = ref<DyMessage[]>([])
const mainCasts = ref<DyMessage[]>([])
const otherCasts = ref<DyMessage[]>([])

export function useDanmuStore() {
  function appendCasts(newAll: DyMessage[], newMain: DyMessage[], newOther: DyMessage[]) {
    if (newAll.length) allCasts.value=newAll
    if (newMain.length) mainCasts.value=newMain
    if (newOther.length) otherCasts.value=newOther

   
  }

  function clearDanmu() {
    allCasts.value.length = 0
    mainCasts.value.length = 0
    otherCasts.value.length = 0
  }

  return {
    allCasts,
    mainCasts,
    otherCasts,
    appendCasts,
    clearDanmu
  }
}
