<template>
  <div
    :class="{
      'cast-list': true,
      'pos-center': pos === 'center',
      'pos-left': pos === 'left',
      'no-prefix': noPrefix,
      'theme-light': theme === 'light',
      'theme-dark': theme === 'dark',
      embedded: embedded
    }">
    <div v-if="!embedded" class="cast-list-header">
      <!-- MAC 前缀 -->
      <div class="mac-prefix">
      </div>
      <!-- 标题 -->
      <div class="title">
        <label>{{ props.title || t('danmu.title') }}</label>
  
      </div>
      <div class="type-icons">
        <!-- <CastTypeBtn v-for="item in castTypes" :key="item.id" :type="item.type" @change="handleCastTypeBtn" /> -->
      </div>
    </div>
    <div class="cast-list-main">
      <DynamicScroller ref="listRef"
  :items="casts"
  :min-item-size="30"
  class="scroller"
  @scroll="onScroll">
        <template v-slot="{ item, index, active }">
          <DynamicScrollerItem
            :item="item"
            :active="active"
            :size-dependencies="[item.content, item.rtfContent]"
            :data-index="item.id">
            <CastItem
              :method="item.method"
              :user="item.user"
              :gift="item.gift"
              :content="item.content"
              :rtf-content="item.rtfContent" />
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>
    </div>
    <div v-if="embedded" class="cast-list-footer">
      <label class="filter-item">
        <input type="checkbox" v-model="showGifts" />
        <span>{{ t('danmuFilter.gifts') }}</span>
      </label>
      <label class="filter-item">
        <input type="checkbox" v-model="showJoins" />
        <span>{{ t('danmuFilter.joins') }}</span>
      </label>
      <label class="filter-item">
        <input type="checkbox" v-model="showLikes" />
        <span>{{ t('danmuFilter.likes') }}</span>
      </label>
      <label class="filter-item">
        <input type="checkbox" v-model="showMessages" />
        <span>{{ t('danmuFilter.messages') }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import CastTypeBtn from '@/components/CastTypeBtn/index.vue';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { CastType } from '@/components/CastTypeBtn/type';
import { getId } from '@/utils/idUtil';
import CastItem from './CastItem.vue';
import { CastMethod, type DyMessage } from '@/core/dycast';
import { throttle } from '@/utils/loashUtil';
import { useDanmuStore } from '@/components/composables/DanmuData'
import type { LivePlatform } from '@/core/livePlatforms'
import { useI18n } from 'vue-i18n'


const { t } = useI18n()
const { allCasts, mainCasts, platformMainCasts } = useDanmuStore()

// 只显示聊天/礼物/emoji

// 所有弹幕
const allDanmu = computed(() => allCasts.value )

// 所有弹幕
const mainDanmu = computed(() => mainCasts.value )

const platformDanmu = computed(() => {
  if (!props.platform) return null
  return platformMainCasts.value[props.platform]
})

interface CastListProps {
  title?: string;
  theme?: 'light' | 'dark';
  types?: CastType[];
  pos?: 'center' | 'left';
  noPrefix?: boolean;
  platform?: LivePlatform;
  embedded?: boolean;
}

const props = withDefaults(defineProps<CastListProps>(), {
  types: () => [],
  noPrefix: false,
  pos: 'center',
  embedded: false
});
// 类型控制器
const typeMap: Map<CastMethod, boolean> = new Map();

/** 右侧类型控制按钮 */
const castTypes = computed(() => {
  return props.types.map(item => {
    return {
      id: getId(),
      type: item
    };
  });
});




/**
 * 控制弹幕显示
 * @param active
 * @param type
 */
const handleCastTypeBtn = function (active?: boolean, type?: CastType) {
  if (type) {
    setCastType(type, active);
    // 整理显示
    //addCasts(mainDanmu.value, true);
  }
};
/**
 * 设置弹幕类型显隐状态
 * @param type
 * @param flag
 */
const setCastType = function (type: CastType, flag?: boolean) {
  switch (type) {
    case 'chat':
      typeMap.set(CastMethod.CHAT, !!flag);
      typeMap.set(CastMethod.EMOJI_CHAT, !!flag);
      break;
    case 'gift':
      typeMap.set(CastMethod.GIFT, !!flag);
      break;
    case 'like':
      typeMap.set(CastMethod.LIKE, !!flag);
      break;
    case 'social':
      typeMap.set(CastMethod.SOCIAL, !!flag);
      break;
    case 'member':
      typeMap.set(CastMethod.MEMBER, !!flag);
      break;
  }
};

/** 显示弹幕 */
const casts = ref<DyMessage[]>([]);

// Filter checkboxes for selecting which danmu types to display
const showGifts = ref(true)
const showJoins = ref(true)
const showLikes = ref(true)
const showMessages = ref(true)

function applyFilterState() {
  typeMap.set(CastMethod.GIFT, showGifts.value)
  typeMap.set(CastMethod.MEMBER, showJoins.value)
  typeMap.set(CastMethod.SOCIAL, showJoins.value)
  typeMap.set(CastMethod.LIKE, showLikes.value)
  typeMap.set(CastMethod.CHAT, showMessages.value)
  typeMap.set(CastMethod.EMOJI_CHAT, showMessages.value)
}

watch([showGifts, showJoins, showLikes, showMessages], () => {
  applyFilterState()
  // Re-filter existing items immediately
  casts.value = casts.value.filter(item => item.method && typeMap.get(item.method))
  flushBuffer()
})

// ── Message buffer for batching ──
const messageBuffer = ref<DyMessage[]>([])
let flushTimer: ReturnType<typeof setTimeout> | undefined
const FLUSH_INTERVAL = 150 // ms, sync with BiliCast batch interval

function startFlushTimer() {
  stopFlushTimer()
  flushTimer = setInterval(() => {
    flushBuffer()
  }, FLUSH_INTERVAL)
}

function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = undefined
  }
}

function flushBuffer() {
  if (messageBuffer.value.length === 0) return
  const batch = messageBuffer.value.splice(0)
  // Filter by active type filters
  const filtered = batch.filter(item => item.method && typeMap.get(item.method))
  if (filtered.length === 0) return
  casts.value.push(...filtered)
  // Throttled auto-scroll: only scroll if at bottom
  if (isAtBottom) {
    nextTick(() => scrollToBottom())
  }
}

/**
 * 设置弹幕显示
 */
const addCasts = function (msgs: DyMessage[], isClear: boolean = false) {
  if (isClear) {
    // Full replacement: flush pending buffer first, then replace
    flushBuffer()
    const list: DyMessage[] = msgs.filter(item => item.method && typeMap.get(item.method));
    casts.value = list
    nextTick(() => {
      autoScrollToBottom();
    });
  } else {
    // Batch: push to buffer instead of directly to casts
    messageBuffer.value.push(...msgs)
  }
};

/**
 * 清空弹幕
 */
onMounted(() => {
  // 初始化
  if (props.types) {
    for (const key of props.types) {
      setCastType(key, true);
      if (key === 'member') {
        typeMap.set(CastMethod.CUSTOM, true);
        typeMap.set(CastMethod.CONTROL, true);
      }
    }
  }
  // Sync checkbox states from the initialized type map
  showGifts.value = typeMap.get(CastMethod.GIFT) ?? true
  showJoins.value = (typeMap.get(CastMethod.MEMBER) ?? true) || (typeMap.get(CastMethod.SOCIAL) ?? true)
  showLikes.value = typeMap.get(CastMethod.LIKE) ?? true
  showMessages.value = (typeMap.get(CastMethod.CHAT) ?? true) || (typeMap.get(CastMethod.EMOJI_CHAT) ?? true)
  // Start the batch flush timer
  startFlushTimer()
});

onUnmounted(() => {
  stopFlushTimer()
  // Flush any remaining buffered messages
  flushBuffer()
});

/** 列表DOM Ref */
const listRef = ref<any>(null);


// 判断是否滚动到底部的容差值，避免边缘情况
const SCROLL_BTH = 50;

let isAtBottom = true;

const onScroll = throttle((e: Event) => {
  const el = e.target as HTMLElement;
  const { scrollTop, clientHeight, scrollHeight } = el;

  isAtBottom =
    scrollTop + clientHeight >= scrollHeight - SCROLL_BTH;
}, 200);



const scrollToBottom = function () {
  listRef.value?.scrollToBottom?.();
};

const autoScrollToBottom = function () {
  if (isAtBottom) scrollToBottom();
};

// Track last seen lengths to detect new items without full replacement
let lastMainLen = 0
const lastPlatformLen: Record<string, number> = {}

// Clear local cast state when switching platforms to prevent cross-platform mixing
watch(() => props.platform, () => {
  if (props.platform) {
    casts.value = []
    messageBuffer.value = []
  }
})

watch(
  mainDanmu,
  (list) => {
    if (props.platform) return
    if (!list) return
    // On first watch fire, do full load
    if (lastMainLen === 0 && list.length > 0) {
      addCasts(list, true)
    } else if (list.length > lastMainLen) {
      // Only push new items
      const newItems = list.slice(lastMainLen)
      addCasts(newItems, false)
    }
    lastMainLen = list.length
  },
  { immediate: true },
)

watch(
  platformDanmu,
  (list) => {
    if (!props.platform) return
    if (!list) return
    const key = props.platform
    const prevLen = lastPlatformLen[key] ?? 0
    // Handle clear case (empty array after having items)
    if (list.length === 0 && prevLen > 0) {
      casts.value = []
      messageBuffer.value = []
      lastPlatformLen[key] = 0
      return
    }
    // On first watch fire, do full load
    if (prevLen === 0 && list.length > 0) {
      addCasts(list, true)
    } else if (list.length > prevLen) {
      // Only push new items
      const newItems = list.slice(prevLen)
      addCasts(newItems, false)
    }
    lastPlatformLen[key] = list.length
  },
  { immediate: true },
)




</script>

<style lang="scss" scoped>
$redCirBg: #ff6157;
$redCirBd: #e24640;
$yellowCirBg: #ffc12f;
$yellowCirBd: #dfa023;
$greenCirBg: #2acb42;
$greenCirBd: #1bac2c;

$shadowB0: #000000;
$shadowB1: rgba(0, 0, 0, 0.1);
$shadowB2: rgba(0, 0, 0, 0.2);
$shadowB3: rgba(0, 0, 0, 0.3);
$shadowB12: rgba(0, 0, 0, 0.12);
$shadowB15: rgba(0, 0, 0, 0.15);
$shadowB05: rgba(0, 0, 0, 0.05);

$shadowW2: rgba(255, 255, 255, 0.2);
$shadowW6: rgba(255, 255, 255, 0.6);

$lightBd: rgba(0, 0, 0, 0.6);
$lightBarBg: #fcfcfc;
$lightBg: #ececec;
$lightText: #4b4b4b;

$darkBd: rgba(0, 0, 0, 0.6);
$darkBarBg: #363636;
$darkBg: #262626;
$darkText: #a5a5a5;
.mac-prefix {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  .cir {
    width: 0.8rem;
    height: 0.8rem;
    box-sizing: border-box;
    border-radius: 50%;
    &.red {
      background-color: $redCirBg;
      border: 0.5px solid $redCirBd;
    }
    &.yellow {
      background-color: $yellowCirBg;
      border: 0.5px solid $yellowCirBd;
    }
    &.green {
      background-color: $greenCirBg;
      border: 0.5px solid $greenCirBd;
    }
  }
}
.cast-list {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0; /* 确保 flex 子项可以收缩 */
  box-shadow: 0px 5px 10px 0px $shadowB3, 0px 3px 6px 0px $shadowB15, 0 0 1px 0 $lightBd;
  border-radius: 0.5rem;
  background-color: $lightBg;
  overflow: hidden;
  position: relative;
  .mac-prefix {
    position: absolute;
    left: 8px;
  }
  &.no-prefix {
    .mac-prefix {
      display: none;
    }
  }
  &.pos-left {
    .cast-list-header {
      .title {
        justify-content: flex-start;
      }
    }
  }
  &.theme-dark {
    background-color: $darkBg;
    border: 0.5px solid $shadowW2;
    box-shadow: 0px 6px 10px 0px $shadowB2, 0px 3px 6px 0px $shadowB12, inset 0px 0.5px 0.5px 0px $shadowW6;
    .cast-list-header {
      background-color: $darkBarBg;
      box-shadow: 0px 1px 0px 0px $shadowB3, 0px 0.5px 0px 0px $shadowB0;
    }
    .title {
      color: $darkText;
    }
    .cast-list-main {
      
      .scroller {
        &::-webkit-scrollbar {
          width: 5px;
        }
        &::-webkit-scrollbar-thumb {
          background: #3f3f3f; // 滑块颜色
          border-radius: 2.5px; // 滑块圆角
        }
        &::-webkit-scrollbar-thumb:hover {
          background: #595959;
        }
        &::-webkit-scrollbar-thumb:active {
          background: #616161;
        }
        &::-webkit-scrollbar-track {
          background: rgba(61, 61, 61, 0.5);
          border-radius: 2.5px; // 滑块圆角
        }
      }
    }
  }
}
.cast-list-header {
  position: relative;
  width: 100%;
  height: 2rem;
  flex-shrink: 0;
  background-color: $lightBarBg;
  box-sizing: border-box;
  padding: 3px 8px;
  display: flex;
  align-items: center;
  box-shadow: 0px 1px 0px 0px $shadowB05, 0px 0.5px 0px 0px $shadowB1;
  .title {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-family: 'mkwxy';
    font-size: 1rem;
    font-weight: bold;
    color: $lightText;
    box-sizing: border-box;
    label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-sizing: border-box;
    }
  }
  .cast-type-btn {
    width: 1.5rem;
    height: 1.5rem;
  }
  .type-icons {
    display: flex;
    align-items: center;
    gap: 5px;
    box-sizing: border-box;
    position: absolute;
    right: 12px;
  }
}
.cast-list-main {
  position: relative;
  width: 100%;
  flex-grow: 1;
  min-height: 0; /* 允许 flex 子项收缩 */
  box-sizing: border-box;
  overflow-y: auto;
  padding: 12px 8px;
  .scroller {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0; /* 允许 flex 子项收缩 */
    box-sizing: border-box;
    &::-webkit-scrollbar {
      width: 5px;
    }
    &::-webkit-scrollbar-thumb {
      background: #ccc; // 滑块颜色
      border-radius: 2.5px; // 滑块圆角
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #bbb;
    }
    &::-webkit-scrollbar-thumb:active {
      background: #999;
    }
    &::-webkit-scrollbar-track {
      background: rgba(217, 217, 217, 0.3);
      border-radius: 2.5px; // 滑块圆角
    }
  }
}

@-moz-document url-prefix() {
  .cast-list-main {
    .scroller {
      scrollbar-width: thin;
      scrollbar-color: #ccc rgba(217, 217, 217, 0.3);
    }
  }
  .cast-list {
    &.theme-dark {
      .cast-list-main {
        .scroller {
          scrollbar-width: thin;
          scrollbar-color: #4f4f4f rgba(61, 61, 61, 0.5);
        }
      }
    }
  }
}
.cast-list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 6px 10px;
  box-sizing: border-box;
  background-color: $lightBarBg;
  box-shadow: 0px -1px 0px 0px $shadowB05, 0px -0.5px 0px 0px $shadowB1;
}

.cast-list.theme-dark .cast-list-footer {
  background-color: $darkBarBg;
  box-shadow: 0px -1px 0px 0px $shadowB3, 0px -0.5px 0px 0px $shadowB0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: $lightText;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.cast-list.theme-dark .filter-item {
  color: $darkText;
}

.filter-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #409eff;
  cursor: pointer;
}
</style>
