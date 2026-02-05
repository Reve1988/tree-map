<script setup lang="ts">
import { useMindMapStore } from '../stores/mindmap';
import { ref, onMounted, onUnmounted } from 'vue';

const store = useMindMapStore();

type ThemeMode = 'light' | 'dark' | 'auto';
const themeMode = ref<ThemeMode>('auto');

function toggleTheme() {
  // Cycle through: light -> dark -> auto -> light
  if (themeMode.value === 'light') {
    themeMode.value = 'dark';
  } else if (themeMode.value === 'dark') {
    themeMode.value = 'auto';
  } else {
    themeMode.value = 'light';
  }
  updateTheme();
}

function updateTheme() {
  const root = document.documentElement;
  let actualTheme: 'light' | 'dark';

  if (themeMode.value === 'auto') {
    // Follow system preference
    actualTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    localStorage.setItem('theme', 'auto');
  } else {
    actualTheme = themeMode.value;
    localStorage.setItem('theme', themeMode.value);
  }

  if (actualTheme === 'light') {
    root.classList.add('light-mode');
  } else {
    root.classList.remove('light-mode');
  }
}

let mediaQuery: MediaQueryList | null = null;
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
  if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
    themeMode.value = savedTheme;
  } else {
    themeMode.value = 'auto';
  }
  
  updateTheme();

  // Listen to system theme changes
  mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  mediaQueryListener = () => {
    if (themeMode.value === 'auto') {
      updateTheme();
    }
  };
  mediaQuery.addEventListener('change', mediaQueryListener);
});

onUnmounted(() => {
  if (mediaQuery && mediaQueryListener) {
    mediaQuery.removeEventListener('change', mediaQueryListener);
  }
});

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

function resetMap() {
    if (confirm('모든 내용이 지워지고 초기화됩니다. 계속하시겠습니까?')) {
        store.reset();
    }
}

function getThemeTooltip() {
  if (themeMode.value === 'light') {
    return '다크 모드로 전환';
  } else if (themeMode.value === 'dark') {
    return '시스템 설정으로 전환';
  } else {
    return '라이트 모드로 전환';
  }
}

const emit = defineEmits<{
  (e: 'convert'): void
}>();
</script>

<template>
  <div class="toolbar">
    <button @click="resetMap">초기화</button>
    <button @click="exportData">저장</button>
    <label class="file-btn">
      불러오기
      <input type="file" accept=".json" @change="importData" hidden />
    </label>
    <button @click="toggleTheme" class="theme-toggle" :title="getThemeTooltip()">
      <!-- Sun icon for light mode -->
      <svg v-if="themeMode === 'light'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <!-- Moon icon for dark mode -->
      <svg v-else-if="themeMode === 'dark'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
      <!-- Auto icon (monitor) for system sync -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  top: 10px;
  right: 10px;
  background: var(--toolbar-bg);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  gap: 8px;
  z-index: 100;
}

button, .file-btn {
  padding: 6px 12px;
  background: var(--button-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: background 0.3s;
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  min-width: 36px;
}

.theme-toggle svg {
  display: block;
}

button:hover, .file-btn:hover {
  background: var(--button-hover);
}
</style>
