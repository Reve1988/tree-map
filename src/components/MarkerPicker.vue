<script setup lang="ts">
import { MARKER_GROUPS } from '../types/markers';

const emit = defineEmits<{
  (e: 'selectMarker', groupId: string, markerId: string): void;
}>();

const props = defineProps<{
  show: boolean;
}>();

function handleMarkerClick(groupId: string, markerId: string) {
  emit('selectMarker', groupId, markerId);
}
</script>

<template>
  <div v-if="show" class="marker-picker">
    <div v-for="group in MARKER_GROUPS" :key="group.id" class="marker-group">
      <div class="group-header">{{ group.name }}</div>
      <div class="markers-grid">
        <button
          v-for="marker in group.markers"
          :key="marker.id"
          class="marker-btn"
          :style="{ backgroundColor: marker.color }"
          :title="marker.label"
          @click="handleMarkerClick(group.id, marker.id)"
        >
          <span v-if="marker.icon" class="marker-icon">{{ marker.icon }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marker-picker {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: var(--toolbar-bg);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.marker-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.marker-group:last-child {
  margin-bottom: 0;
}

.group-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
  padding: 0 4px;
}

.markers-grid {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.marker-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.marker-btn:hover {
  transform: scale(1.05);
  border-color: var(--text-color);
  opacity: 0.8;
}

.marker-icon {
  font-size: 11px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
