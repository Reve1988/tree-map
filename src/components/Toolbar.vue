<script setup lang="ts">
import { useMindMapStore } from '../stores/mindmap';

const store = useMindMapStore();

function exportData() {
  const data = JSON.stringify(store.root, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mindmap.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const data = JSON.parse(content);
      // Basic validation: check if it has children array
      if (data && Array.isArray(data.children)) {
          store.root = data;
      } else {
        alert('Invalid MindMap JSON');
      }
    } catch (err) {
      alert('Failed to parse JSON');
    }
  };
  reader.readAsText(file);
}
</script>

<template>
  <div class="toolbar">
    <button @click="exportData">Export JSON</button>
    <label class="file-btn">
      Import JSON
      <input type="file" accept=".json" @change="importData" hidden />
    </label>
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  top: 10px;
  right: 10px;
  background: white;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  gap: 8px;
  z-index: 100;
}

button, .file-btn {
  padding: 6px 12px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
}

button:hover, .file-btn:hover {
  background: #e0e0e0;
}
</style>
