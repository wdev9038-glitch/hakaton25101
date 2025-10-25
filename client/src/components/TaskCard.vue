<template>
  <div class="task-card bg-white p-4 draggable-task" :data-task-id="task.id">
    <div class="flex justify-between items-start">
      <h4 class="font-medium text-gray-800">{{ task.title }}</h4>
      <button
        @click="$emit('delete', task.id)"
        class="text-gray-400 hover:text-red-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    <p class="text-sm text-gray-600 mt-2" v-if="task.description">{{ task.description }}</p>
    <div class="flex items-center justify-between mt-3">
      <div class="flex items-center space-x-2">
        <span
          class="text-xs px-2 py-1 rounded-full"
          :class="{
            'bg-blue-100 text-blue-800': task.priority === 'low',
            'bg-yellow-100 text-yellow-800': task.priority === 'medium',
            'bg-red-100 text-red-800': task.priority === 'high'
          }"
        >
          {{ task.priority === 'low' ? 'Низкий' : task.priority === 'medium' ? 'Средний' : 'Высокий' }}
        </span>
        <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
          {{ task.xp }} XP
        </span>
        <span v-if="task.deadline" class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
          {{ formatDate(task.deadline) }}
        </span>
      </div>
      <div class="flex space-x-2">
        <button
          @click="$emit('view', task.id)"
          class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded-full transition-colors"
        >
          📋
        </button>
        <button
          v-if="status !== 'todo'"
          @click="$emit('move', { id: task.id, status: 'todo' })"
          class="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded-full transition-colors"
        >
          Назад
        </button>
        <button
          v-if="status === 'todo'"
          @click="$emit('move', { id: task.id, status: 'in_progress' })"
          class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors"
        >
          В работу
        </button>
        <button
          v-if="status === 'in_progress'"
          @click="$emit('move', { id: task.id, status: 'done' })"
          class="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full transition-colors"
        >
          Готово
        </button>
        <button
          v-if="status === 'done'"
          @click="$emit('move', { id: task.id, status: 'in_progress' })"
          class="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-full transition-colors"
        >
          Вернуть
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TaskCard',
  props: {
    task: {
      type: Object,
      required: true
    },
    status: {
      type: String,
      required: true
    }
  },
  emits: ['delete', 'move', 'view'],
  methods: {
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU');
    }
  }
}
</script>