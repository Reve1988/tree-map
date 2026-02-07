<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useMindMapStore } from '../stores/mindmap';
import type { MindMapNode } from '../types/mindmap';

const store = useMindMapStore();

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  navigate: [nodeId: string];
}>();

const searchQuery = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const selectedIndex = ref(0);

// Flatten tree for searching
function flattenTree(node: MindMapNode, list: MindMapNode[] = []): MindMapNode[] {
  list.push(node);
  for (const child of node.children) {
    flattenTree(child, list);
  }
  return list;
}

const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return [];
  const query = searchQuery.value.toLowerCase();
  const allNodes = flattenTree(store.root);
  return allNodes.filter(node => 
    node.text.toLowerCase().includes(query)
  );
});

// Reset selected index when results change
watch(searchResults, () => {
  selectedIndex.value = 0;
});

// Focus input when modal opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    searchQuery.value = '';
    selectedIndex.value = 0;
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

function selectResult(nodeId: string) {
  emit('navigate', nodeId);
  emit('close');
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (selectedIndex.value < searchResults.value.length - 1) {
      selectedIndex.value++;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (selectedIndex.value > 0) {
      selectedIndex.value--;
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (searchResults.value.length > 0) {
      const id = searchResults.value[selectedIndex.value]?.id;
      if (id) selectResult(id);
    }
  } else if (e.key === 'Escape') {
    emit('close');
  }
}

function getNodePath(node: MindMapNode): string {
  const parts: string[] = [];
  let current: MindMapNode | undefined = node;
  while (current && current.parentId) {
    current = store.findNode(current.parentId);
    if (current) parts.unshift(current.text);
  }
  return parts.length > 0 ? parts.join(' > ') : '';
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="search-overlay" @click.self="$emit('close')">
      <div class="search-modal" @keydown="onKeyDown">
        <div class="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            placeholder="노드 검색..."
            class="search-input"
            autocomplete="off"
          />
        </div>
        <div class="search-results">
          <div v-if="searchQuery && searchResults.length === 0" class="no-results">
            검색 결과가 없습니다
          </div>
          <button
            v-for="(node, index) in searchResults"
            :key="node.id"
            class="result-item"
            :class="{ active: index === selectedIndex }"
            @click="selectResult(node.id)"
            @mouseenter="selectedIndex = index"
          >
            <span class="result-text">{{ node.text }}</span>
            <span v-if="getNodePath(node)" class="result-path">{{ getNodePath(node) }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10000;
  display: flex;
  justify-content: center;
  padding-top: 15vh;
}

.search-modal {
  width: 480px;
  max-width: 90vw;
  max-height: 400px;
  background: var(--toolbar-bg);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: fit-content;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #eee);
  gap: 10px;
}

.search-icon {
  color: var(--text-color, #999);
  opacity: 0.5;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  background: transparent;
  color: var(--text-color, #333);
}

.search-input::placeholder {
  color: var(--text-color, #999);
  opacity: 0.4;
}

.search-results {
  overflow-y: auto;
  max-height: 320px;
}

.no-results {
  padding: 20px;
  text-align: center;
  color: var(--text-color, #999);
  opacity: 0.6;
  font-size: 14px;
}

.result-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--text-color, #333);
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  gap: 2px;
}

.result-item.active {
  background: rgba(59, 130, 246, 0.1);
}

.result-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.result-text {
  font-weight: 500;
}

.result-path {
  font-size: 12px;
  color: var(--text-color, #999);
  opacity: 0.5;
}
</style>
