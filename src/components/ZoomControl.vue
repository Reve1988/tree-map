<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minZoom: 0.25,
  maxZoom: 3
});

const emit = defineEmits<{
  zoomIn: [];
  zoomOut: [];
  resetZoom: [];
}>();

const zoomPercentage = computed(() => Math.round(props.zoom * 100));

const canZoomIn = computed(() => props.zoom < props.maxZoom);
const canZoomOut = computed(() => props.zoom > props.minZoom);

function handleZoomIn() {
  if (canZoomIn.value) {
    emit('zoomIn');
  }
}

function handleZoomOut() {
  if (canZoomOut.value) {
    emit('zoomOut');
  }
}

function handleResetZoom() {
  emit('resetZoom');
}
</script>

<template>
  <div class="zoom-control">
    <button 
      class="zoom-btn reset-btn"
      @click="handleResetZoom"
      title="Reset to 100%"
    >
      ↻
    </button>
    <button 
      class="zoom-btn" 
      :disabled="!canZoomOut"
      @click="handleZoomOut"
      title="Zoom Out"
    >
      −
    </button>
    <div class="zoom-display">{{ zoomPercentage }}%</div>
    <button 
      class="zoom-btn"
      :disabled="!canZoomIn"
      @click="handleZoomIn"
      title="Zoom In"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.zoom-control {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--toolbar-bg);
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  background: var(--button-bg);
  color: var(--text-color);
  border: none;
  border-radius: 4px;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.zoom-btn:hover:not(:disabled) {
  background: var(--button-hover);
}

.zoom-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-display {
  min-width: 50px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}
</style>
