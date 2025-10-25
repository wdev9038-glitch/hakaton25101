<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-800">Настройки LLM</h3>
          <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label for="llm_ip" class="block text-sm font-medium text-gray-700">IP-адрес LLM (например, http://localhost:1234)</label>
            <input v-model="settings.llm_ip" id="llm_ip" type="text" class="form-input mt-1" placeholder="http://localhost:1234">
          </div>
          <div>
            <label for="llm_model" class="block text-sm font-medium text-gray-700">Модель LLM</label>
            <input v-model="settings.llm_model" id="llm_model" type="text" class="form-input mt-1" placeholder="google/gemma-3n-e4b">
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button @click="saveSettings" class="btn-primary">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'Settings',
  data() {
    return {
      settings: {
        llm_ip: '',
        llm_model: ''
      }
    };
  },
  async created() {
    await this.fetchSettings();
  },
  methods: {
    async fetchSettings() {
      try {
        const response = await axios.get('/api/settings');
        this.settings = response.data.data;
      } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
      }
    },
    async saveSettings() {
      try {
        await axios.post('/api/settings', this.settings);
        this.$emit('close');
      } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
      }
    }
  }
};
</script>

<style scoped>
.form-input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500;
}

.btn-primary {
  @apply bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors;
}
</style>