<template>
  <div class="board-container min-h-screen">
    <!-- Панель геймификации -->
    <div class="bg-white shadow-md py-3 px-6 flex items-center justify-between">
      <div class="flex items-center space-x-6">
        <h1 class="text-xl font-bold text-gray-800">Task Tracker</h1>
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-600">Уровень: {{ user.level }}</span>
          <div class="w-32 bg-gray-200 rounded-full h-2.5">
            <div 
              class="bg-blue-600 h-2.5 rounded-full xp-progress" 
              :style="{ width: xpPercentage + '%' }"
            ></div>
          </div>
          <span class="text-sm font-medium text-gray-600">{{ user.xp }} XP</span>
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
        <button 
          @click="showAchievements = !showAchievements"
          class="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span 
            v-if="unlockedAchievements.length > 0" 
            class="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
          >
            {{ unlockedAchievements.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- Панель создания задачи -->
    <div class="max-w-4xl mx-auto mt-6 px-4">
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-800">Добавить новую задачу</h2>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div class="md:col-span-2">
            <input
              v-model="newTask.title"
              type="text"
              placeholder="Название задачи"
              class="form-input"
            />
          </div>
          <div>
            <select v-model="newTask.priority" class="form-input">
              <option value="low">Низкий приоритет</option>
              <option value="medium">Средний приоритет</option>
              <option value="high">Высокий приоритет</option>
            </select>
          </div>
          <div>
            <input
              v-model="newTask.xp"
              type="number"
              min="1"
              max="100"
              placeholder="XP"
              class="form-input"
            />
          </div>
          <div>
            <input
              v-model="newTask.deadline"
              type="date"
              placeholder="Срок"
              class="form-input"
            />
          </div>
        </div>
        <div class="mt-4">
          <textarea
            v-model="newTask.description"
            placeholder="Описание задачи"
            class="form-input"
            rows="2"
          ></textarea>
        </div>
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Или опишите задачу для генерации:</label>
          <textarea
            v-model="generationPrompt"
            placeholder="Например: 'Создать презентацию для проекта по анализу данных'"
            class="form-input"
            rows="2"
          ></textarea>
        </div>
        <div class="mt-4 flex justify-between">
          <button
            @click="generateTask"
            :disabled="isGenerating"
            class="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            :class="{ 'opacity-50 cursor-not-allowed': isGenerating }"
          >
            {{ isGenerating ? 'Генерация...' : '🤖 Сгенерировать задачу' }}
          </button>
          <button
            @click="addTask"
            :disabled="!newTask.title"
            class="btn-primary"
            :class="{ 'opacity-50 cursor-not-allowed': !newTask.title }"
          >
            Добавить задачу
          </button>
        </div>
      </div>
    </div>

    <!-- Доска задач -->
    <div class="kanban-board">
      <!-- Колонка "К выполнению" -->
      <div class="kanban-column" data-status="todo">
        <h3 class="font-semibold text-gray-700 mb-4 flex items-center">
          <span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">●</span>
          К выполнению
          <span class="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full ml-2">
            {{ todoTasks.length }}
          </span>
        </h3>
        <draggable class="space-y-3" :list="todoTasks" group="tasks" @end="onDragEnd">
          <template #item="{element}">
            <TaskCard
              :task="element"
              status="todo"
              @delete="deleteTask"
              @move="moveTask"
              @view="viewTask"
            />
          </template>
        </draggable>
      </div>

      <!-- Колонка "В работе" -->
      <div class="kanban-column" data-status="in_progress">
        <h3 class="font-semibold text-gray-700 mb-4 flex items-center">
          <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">●</span>
          В работе
          <span class="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full ml-2">
            {{ inProgressTasks.length }}
          </span>
        </h3>
        <draggable class="space-y-3" :list="inProgressTasks" group="tasks" @end="onDragEnd">
          <template #item="{element}">
            <TaskCard
              :task="element"
              status="in_progress"
              @delete="deleteTask"
              @move="moveTask"
              @view="viewTask"
            />
          </template>
        </draggable>
      </div>

      <!-- Колонка "Готово" -->
      <div class="kanban-column" data-status="done">
        <h3 class="font-semibold text-gray-700 mb-4 flex items-center">
          <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">●</span>
          Готово
          <span class="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full ml-2">
            {{ doneTasks.length }}
          </span>
        </h3>
        <draggable class="space-y-3" :list="doneTasks" group="tasks" @end="onDragEnd">
          <template #item="{element}">
            <TaskCard
              :task="element"
              status="done"
              @delete="deleteTask"
              @move="moveTask"
              @view="viewTask"
            />
          </template>
        </draggable>
      </div>
    </div>

    <!-- Календарь задач -->
    <div class="max-w-6xl mx-auto mt-8 px-4">
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-800">Календарь задач</h2>
        <FullCalendar
          :options="calendarOptions"
          class="calendar-container"
        />
      </div>
    </div>

    <!-- Модальное окно достижений -->
    <div v-if="showAchievements" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Достижения</h3>
            <button @click="showAchievements = false" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div v-if="unlockedAchievements.length === 0" class="text-center py-8">
            <p class="text-gray-600">Пока нет достижений. Выполняйте задачи, чтобы заработать первые!</p>
          </div>
          
          <div v-else class="space-y-4">
            <div 
              v-for="achievement in unlockedAchievements" 
              :key="achievement.id"
              class="flex items-center p-4 border border-gray-200 rounded-lg achievement-badge"
            >
              <div class="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-gray-800">{{ achievement.name }}</h4>
                <p class="text-sm text-gray-600">{{ achievement.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно просмотра задачи -->
    <div v-if="showTaskModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Просмотр задачи</h3>
            <button @click="closeTaskModal" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="selectedTask" class="space-y-4">
            <div>
              <h4 class="font-medium text-gray-800 text-lg">{{ selectedTask.title }}</h4>
              <p class="text-gray-600 mt-1">{{ selectedTask.description }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-sm font-medium text-gray-500">Приоритет:</span>
                <span class="ml-2 px-2 py-1 rounded-full text-xs"
                      :class="{
                        'bg-blue-100 text-blue-800': selectedTask.priority === 'low',
                        'bg-yellow-100 text-yellow-800': selectedTask.priority === 'medium',
                        'bg-red-100 text-red-800': selectedTask.priority === 'high'
                      }">
                  {{ selectedTask.priority === 'low' ? 'Низкий' : selectedTask.priority === 'medium' ? 'Средний' : 'Высокий' }}
                </span>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-500">XP:</span>
                <span class="ml-2 text-sm text-gray-800">{{ selectedTask.xp }}</span>
              </div>
              <div v-if="selectedTask.deadline">
                <span class="text-sm font-medium text-gray-500">Срок:</span>
                <span class="ml-2 text-sm text-gray-800">{{ formatDate(selectedTask.deadline) }}</span>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-500">Статус:</span>
                <span class="ml-2 text-sm text-gray-800">{{ selectedTask.status }}</span>
              </div>
            </div>

            <div>
              <h4 class="font-medium text-gray-800 mb-2">История изменений</h4>
              <div v-if="taskHistory.length === 0" class="text-gray-500 text-sm">
                Нет изменений
              </div>
              <div v-else class="space-y-2">
                <div v-for="change in taskHistory" :key="change.id" class="border-l-2 border-gray-200 pl-3">
                  <div class="text-xs text-gray-500">{{ formatDateTime(change.changed_at) }}</div>
                  <div class="text-sm">
                    <span class="font-medium">{{ change.field_changed }}:</span>
                    <span v-if="change.old_value" class="text-red-600"> {{ change.old_value }}</span>
                    <span v-if="change.old_value && change.new_value"> → </span>
                    <span v-if="change.new_value" class="text-green-600">{{ change.new_value }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import TaskCard from './components/TaskCard.vue'
import draggable from 'vuedraggable'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'

export default {
  name: 'App',
  components: {
    TaskCard,
    draggable,
    FullCalendar
  },
  data() {
    return {
      tasks: [],
      user: {
        xp: 0,
        level: 1
      },
      newTask: {
        title: '',
        description: '',
        priority: 'medium',
        xp: 10,
        deadline: ''
      },
      showAchievements: false,
      achievements: [],
      showTaskModal: false,
      selectedTask: null,
      taskHistory: [],
      generationPrompt: '',
      isGenerating: false
    }
  },
  computed: {
    xpPercentage() {
      // Процент XP до следующего уровня (каждый уровень = 100 XP)
      return (this.user.xp % 100);
    },
    todoTasks() {
      return this.tasks.filter(task => task.status === 'todo');
    },
    inProgressTasks() {
      return this.tasks.filter(task => task.status === 'in_progress');
    },
    doneTasks() {
      return this.tasks.filter(task => task.status === 'done');
    },
    tasksWithDeadlines() {
      return this.tasks.filter(task => task.deadline);
    },
    unlockedAchievements() {
      return this.achievements.filter(ach => ach.unlocked);
    },
    calendarOptions() {
      return {
        plugins: [dayGridPlugin],
        initialView: 'dayGridMonth',
        events: this.tasksWithDeadlines.map(task => ({
          id: task.id,
          title: task.title,
          start: task.deadline,
          backgroundColor: this.getEventColor(task),
          borderColor: this.getEventColor(task),
          textColor: 'white'
        })),
        eventClick: this.handleEventClick,
        locale: 'ru',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek'
        },
        height: 'auto'
      };
    }
  },
  async mounted() {
    await this.fetchData();
    // Обновляем данные каждые 5 секунд
    setInterval(this.fetchData, 5000);
  },
  methods: {
    async fetchData() {
      try {
        const [tasksRes, userRes, achievementsRes] = await Promise.all([
          axios.get('/api/tasks'),
          axios.get('/api/user'),
          axios.get('/api/achievements')
        ]);
        
        this.tasks = tasksRes.data.data || [];
        this.user = userRes.data.data || { xp: 0, level: 1 };
        this.achievements = achievementsRes.data.data || [];
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      }
    },
    async addTask() {
      if (!this.newTask.title.trim()) return;
      
      try {
        await axios.post('/api/tasks', {
          title: this.newTask.title,
          description: this.newTask.description,
          priority: this.newTask.priority,
          xp: parseInt(this.newTask.xp) || 10,
          deadline: this.newTask.deadline || null
        });
        
        this.newTask = {
          title: '',
          description: '',
          priority: 'medium',
          xp: 10,
          deadline: ''
        };
        this.generationPrompt = '';
        
        await this.fetchData();
      } catch (error) {
        console.error('Ошибка при добавлении задачи:', error);
      }
    },
    async moveTask({ id, status }) {
      await this.toggleTaskStatus(id, status);
    },
    async toggleTaskStatus(taskId, newStatus) {
      try {
        const completed = newStatus === 'done' ? 1 : 0;
        
        await axios.put(`/api/tasks/${taskId}`, {
          status: newStatus,
          completed: completed
        });
        
        await this.fetchData();
      } catch (error) {
        console.error('Ошибка при обновлении задачи:', error);
      }
    },
    async deleteTask(taskId) {
      try {
        await axios.delete(`/api/tasks/${taskId}`);
        await this.fetchData();
      } catch (error) {
        console.error('Ошибка при удалении задачи:', error);
      }
    },
    async onDragEnd(event) {
      const { to, item } = event;
      const newStatus = to.parentElement.dataset.status;
      const taskId = item.dataset.taskId;

      if (newStatus && taskId) {
        const task = this.tasks.find(t => t.id == taskId);
        if (task && task.status !== newStatus) {
          await this.toggleTaskStatus(taskId, newStatus);
        }
      }
    },
    async viewTask(taskId) {
      const task = this.tasks.find(t => t.id == taskId);
      if (task) {
        this.selectedTask = task;
        this.showTaskModal = true;

        // Загружаем историю задачи
        try {
          const response = await axios.get(`/api/tasks/${taskId}/history`);
          this.taskHistory = response.data.data || [];
        } catch (error) {
          console.error('Ошибка при загрузке истории задачи:', error);
          this.taskHistory = [];
        }
      }
    },
    closeTaskModal() {
      this.showTaskModal = false;
      this.selectedTask = null;
      this.taskHistory = [];
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU');
    },
    formatDateTime(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU');
    },
    getEventColor(task) {
      const today = new Date();
      const deadline = new Date(task.deadline);
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return '#ef4444'; // Красный для просроченных
      if (diffDays <= 1) return '#f59e0b'; // Оранжевый для сегодня/завтра
      if (diffDays <= 3) return '#eab308'; // Желтый для 2-3 дней
      return '#10b981'; // Зеленый для более далеких
    },
    handleEventClick(info) {
      const taskId = parseInt(info.event.id);
      this.viewTask(taskId);
    },
    async generateTask() {
      if (!this.generationPrompt.trim()) return;

      this.isGenerating = true;
      try {
        // 1. Получаем сгенерированные данные от бэкенда
        const response = await axios.post('/api/tasks/generate', {
          prompt: this.generationPrompt
        });

        const generatedTask = response.data.task;

        // 2. Сразу создаем задачу на основе полученных данных
        await axios.post('/api/tasks', {
          title: generatedTask.title,
          description: generatedTask.description,
          priority: generatedTask.priority,
          xp: parseInt(generatedTask.xp) || 10,
          deadline: generatedTask.deadline || null
        });

        this.generationPrompt = ''; // Очищаем поле
        await this.fetchData(); // Обновляем доску

      } catch (error) {
        console.error('Ошибка при генерации задачи:', error);
        alert('Ошибка при генерации задачи. Убедитесь, что LM Studio запущен на порту 1234.');
      } finally {
        this.isGenerating = false;
      }
    }
  }
}
</script>

<style>
/* Стили для формы */
.form-input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500;
}

/* Стили для кнопок */
.btn-primary {
  @apply bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors;
}

/* Стили для доски */
.kanban-board {
  @apply flex space-x-6 overflow-x-auto pb-6 mt-6;
}

.kanban-column {
  @apply bg-gray-50 rounded-lg p-4 min-w-80 flex-shrink-0;
}

.task-card {
  @apply border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-move;
}

.task-card:hover {
  @apply transform translate-y-0.5;
}

/* Стили для XP прогресса */
.xp-progress {
  transition: width 0.3s ease;
}

/* Стили для достижений */
.achievement-badge {
  transition: transform 0.2s ease;
}

.achievement-badge:hover {
  @apply transform scale-105;
}

/* Стили для календаря */
.calendar-container {
  @apply mt-4;
}

.calendar-container :deep(.fc) {
  @apply text-sm;
}

.calendar-container :deep(.fc-button) {
  @apply bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600;
}

.calendar-container :deep(.fc-event) {
  @apply cursor-pointer;
}

.calendar-container :deep(.fc-event:hover) {
  @apply opacity-80;
}
</style>