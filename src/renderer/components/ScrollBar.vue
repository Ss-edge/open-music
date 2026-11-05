<template>
  <div>
    <div v-show="show" class="scrollbar">
      <div
        :class="{ active }"
        class="thumbContainer"
        :style="thumbStyle"
        @mouseenter="handleMouseenter"
        @mouseleave="handleMouseleave"
        @mousedown="handleDragStart"
      >
        <div></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '../utils/eventBus'
import { useNormalStateStore } from '../store/state'
import { useRouter } from 'vue-router'

const show = ref(false)
const active = ref(false)
const isOnDrag = ref(false)
const onDragClientY = ref(0)
const hideTimer = ref()
const router = useRouter()
const updateUserSelect = inject('updateUserSelect', ref(false))

const normalState = useNormalStateStore()
const { scrollbar } = storeToRefs(normalState)

const mainRef = inject('mainRef', ref<HTMLElement>())
const panelHeight = ref(0)
const activeScroll = computed(() =>
  scrollbar.value.active ? scrollbar.value.instances[scrollbar.value.active] : undefined
)
const scrollHeight = computed(() => activeScroll.value?.listHeight || 0)
const clientHeight = computed(() => activeScroll.value?.containerHeight || 0)
const scrollTop = computed(() => activeScroll.value?.scrollTop || 0)
const trackHeight = computed(() => panelHeight.value || clientHeight.value)
const scrollRange = computed(() => Math.max(0, scrollHeight.value - clientHeight.value))
const thumbHeight = computed(() =>
  Math.min(
    trackHeight.value,
    Math.max(30, (clientHeight.value / (scrollHeight.value || 1)) * trackHeight.value)
  )
)
const thumbTravel = computed(() => Math.max(0, trackHeight.value - thumbHeight.value))
const updatePanelHeight = () => {
  panelHeight.value = mainRef.value?.clientHeight || 0
}
const panelObserver = new ResizeObserver(updatePanelHeight)

onMounted(() => {
  updatePanelHeight()
  if (mainRef.value) panelObserver.observe(mainRef.value)
})

watch(scrollTop, () => {
  show.value = scrollRange.value > 0
  setScrollbarHideTimeout()
})

watch(
  () => scrollbar.value.active,
  (value) => {
    if (!value) {
      if (hideTimer.value) clearTimeout(hideTimer.value)
      hideTimer.value = null
      show.value = false
    }
  }
)

const thumbStyle = computed(() => {
  if (!scrollRange.value) return {}
  const position = Math.min(scrollRange.value, Math.max(0, scrollTop.value))
  const top = (position / scrollRange.value) * thumbTravel.value
  return { height: `${thumbHeight.value}px`, transform: `translateY(${top}px)` }
})

const handleMouseenter = () => {
  active.value = true
}

const scrollMainTo = inject<(to: number, behavior: 'smooth' | 'instant') => void>(
  'scrollMainTo',
  () => {}
)

const handleMouseleave = () => {
  setScrollbarHideTimeout()
  active.value = false
}

const setScrollbarHideTimeout = () => {
  if (hideTimer.value) clearTimeout(hideTimer.value)
  hideTimer.value = setTimeout(() => {
    if (!active.value) show.value = false
    hideTimer.value = null
  }, 4000)
}

const handleDragStart = (event: MouseEvent) => {
  isOnDrag.value = true
  onDragClientY.value = event.clientY
  updateUserSelect.value = true
  eventBus.emit('update-start')
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
}

const handleDragMove = (e: MouseEvent) => {
  if (!isOnDrag.value || !thumbTravel.value) return
  const offset = Math.round(
    ((e.clientY - onDragClientY.value) / thumbTravel.value) * scrollRange.value
  )
  eventBus.emit('update-scroll-bar', { active: scrollbar.value.active, offset })
}

const handleDragEnd = () => {
  isOnDrag.value = false
  updateUserSelect.value = false
  eventBus.emit('update-done')
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

onBeforeUnmount(() => {
  panelObserver.disconnect()
  if (hideTimer.value) clearTimeout(hideTimer.value)
  handleDragEnd()
})

router.beforeEach((to, from, next) => {
  show.value = false
  scrollMainTo(0, 'instant')
  next()
})
</script>

<style scoped lang="scss">
.scrollbar {
  position: fixed;
  top: calc(var(--open-titlebar-height, 0px) + 80px);
  right: 8px;
  bottom: var(--open-player-space, 104px);
  width: 16px;
  z-index: 1000;

  .thumbContainer {
    div {
      transition: background 0.4s;
      position: absolute;
      right: 4px;
      width: 8px;
      height: 100%;
      border-radius: 4px;
      background: rgba(128, 128, 128, 0.38);
    }
  }

  .thumbContainer.active div {
    background: rgba(128, 128, 128, 0.58);
  }
}
</style>
