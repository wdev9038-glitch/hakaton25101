const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const portfinder = require('portfinder');
const axios = require('axios');

// Настройка приложения
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('client/dist'));

// Настройка порта
portfinder.getPort({
  port: 3000,
  stopPort: 4000
}, (err, port) => {
  if (err) {
    console.error('Error finding available port:', err);
    process.exit(1);
  }

  // Подключение к SQLite
  const dbPath = path.join(__dirname, 'task-tracker.db');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
      
      // Создание таблиц
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        xp INTEGER DEFAULT 10,
        completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        deadline DATETIME
      )`, (err) => {
        if (err) {
          console.error('Error creating tasks table:', err);
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        unlocked BOOLEAN DEFAULT 0,
        user_id INTEGER,
        task_id INTEGER,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (task_id) REFERENCES tasks (id)
      )`, (err) => {
        if (err) {
          console.error('Error creating achievements table:', err);
        }
      });

      // Создание таблицы истории задач
      db.run(`CREATE TABLE IF NOT EXISTS task_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        field_changed TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id)
      )`, (err) => {
        if (err) {
          console.error('Error creating task_history table:', err);
        }
      });

      // Инициализация пользователя по умолчанию
      db.run(`INSERT OR IGNORE INTO users (username, xp, level) VALUES ('default_user', 0, 1)`, (err) => {
        if (err) {
          console.error('Error initializing default user:', err);
        }
      });
    }
  });

  // API маршруты для задач
  // Получение всех задач
  app.get('/api/tasks', (req, res) => {
    const sql = 'SELECT * FROM tasks ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: 'success',
        data: rows
      });
    });
  });

  // Создание новой задачи
  app.post('/api/tasks', (req, res) => {
    const { title, description, priority = 'medium', xp = 10, deadline } = req.body;
    const sql = 'INSERT INTO tasks (title, description, priority, xp, deadline) VALUES (?, ?, ?, ?, ?)';
    const params = [title, description, priority, xp, deadline];
    
    db.run(sql, params, function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: 'Task created successfully',
        id: this.lastID
      });
    });
  });

  // Обновление задачи
  app.put('/api/tasks/:id', (req, res) => {
    const id = req.params.id;
    const { title, description, status, priority, completed, deadline } = req.body;

    // Сначала получаем текущие данные задачи
    const getTaskSql = 'SELECT * FROM tasks WHERE id = ?';
    db.get(getTaskSql, [id], (err, currentTask) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }

      if (!currentTask) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const sql = `UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        completed = COALESCE(?, completed),
        deadline = COALESCE(?, deadline),
        completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = ?`;

      const params = [title, description, status, priority, completed, deadline, completed, id];

      db.run(sql, params, function(err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }

        // Записываем изменения в историю
        const fieldsToCheck = ['title', 'description', 'status', 'priority', 'completed', 'deadline'];
        fieldsToCheck.forEach(field => {
          const oldValue = currentTask[field];
          const newValue = req.body[field] !== undefined ? req.body[field] : oldValue;

          if (oldValue !== newValue) {
            const historySql = 'INSERT INTO task_history (task_id, field_changed, old_value, new_value) VALUES (?, ?, ?, ?)';
            db.run(historySql, [id, field, oldValue, newValue], (err) => {
              if (err) {
                console.error('Error inserting into task_history:', err);
              }
            });
          }
        });

        // Если задача выполнена, обновляем XP пользователя
        if (completed && !currentTask.completed) {
          const getTaskSql = 'SELECT xp FROM tasks WHERE id = ?';
          db.get(getTaskSql, [id], (err, task) => {
            if (err) {
              console.error('Error getting task:', err);
              return;
            }

            // Добавляем XP пользователю
            db.run(`UPDATE users SET xp = xp + ? WHERE username = 'default_user'`, [task.xp], (err) => {
              if (err) {
                console.error('Error updating user XP:', err);
              } else {
                // Проверяем, нужно ли повысить уровень
                db.get(`SELECT xp, level FROM users WHERE username = 'default_user'`, (err, user) => {
                  if (err) {
                    console.error('Error getting user:', err);
                    return;
                  }

                  const newLevel = Math.floor(user.xp / 100) + 1;
                  if (newLevel > user.level) {
                    db.run(`UPDATE users SET level = ? WHERE username = 'default_user'`, [newLevel], (err) => {
                      if (err) {
                        console.error('Error updating user level:', err);
                      }
                    });

                    // Проверяем достижения
                    checkAchievements(db, task.xp);
                  }
                });
              }
            });
          });
        }

        res.json({
          message: 'Task updated successfully',
          changes: this.changes
        });
      });
    });
  });

  // Удаление задачи
  app.delete('/api/tasks/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM tasks WHERE id = ?';
    
    db.run(sql, id, function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: 'Task deleted successfully',
        changes: this.changes
      });
    });
  });

  // API маршруты для пользователя
  app.get('/api/user', (req, res) => {
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, ['default_user'], (err, row) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: 'success',
        data: row
      });
    });
  });

  // API маршруты для достижений
  app.get('/api/achievements', (req, res) => {
    const sql = `SELECT * FROM achievements WHERE user_id = (
      SELECT id FROM users WHERE username = 'default_user'
    ) ORDER BY unlocked_at DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: 'success',
        data: rows
      });
    });
  });

  // API маршрут для истории задач
  app.get('/api/tasks/:id/history', (req, res) => {
    const taskId = req.params.id;
    const sql = 'SELECT * FROM task_history WHERE task_id = ? ORDER BY changed_at DESC';
    db.all(sql, [taskId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: 'success',
        data: rows
      });
    });
  });

  // API маршрут для генерации задач с помощью LLM
  app.post('/api/tasks/generate', async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Отправляем запрос к LM Studio
      const response = await axios.post('http://127.0.0.1:1234/v1/chat/completions', {
        model: 'local-model', // Укажите модель, если нужно
        messages: [
          {
            role: 'system',
            content: 'Ты помощник по созданию задач. На основе описания пользователя создай задачу в формате JSON: {"title": "Название", "description": "Описание", "priority": "low|medium|high", "xp": 10, "deadline": "YYYY-MM-DD"}. Учитывай приоритет и XP на основе сложности.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      const generatedText = response.data.choices[0].message.content;

      // Парсим JSON из ответа
      let taskData;
      try {
        taskData = JSON.parse(generatedText);
      } catch (parseError) {
        return res.status(400).json({ error: 'Failed to parse generated task data' });
      }

      // Сохраняем задачу в базу данных
      const { title, description, priority = 'medium', xp = 10, deadline } = taskData;
      const sql = 'INSERT INTO tasks (title, description, priority, xp, deadline) VALUES (?, ?, ?, ?, ?)';
      const params = [title, description, priority, xp, deadline];

      db.run(sql, params, function(err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({
          message: 'Task generated and created successfully',
          id: this.lastID,
          task: taskData
        });
      });

    } catch (error) {
      console.error('Error generating task:', error);
      res.status(500).json({ error: 'Failed to generate task' });
    }
  });

  // Главная страница
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });

  // Запуск сервера
  app.listen(port, () => {
    console.log(`Task Tracker server running on port ${port}`);
    console.log(`Database location: ${dbPath}`);
  });
});

// Функция проверки достижений
function checkAchievements(db, taskXp) {
  // Проверяем достижение "Первая задача"
  db.get(`SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND user_id = (
    SELECT id FROM users WHERE username = 'default_user'
  )`, (err, result) => {
    if (err) return;
    
    if (result.count === 1) {
      // Это первая выполненная задача
      db.run(`INSERT OR IGNORE INTO achievements (name, description, icon, user_id) 
        VALUES ('Первая задача', 'Выполните свою первую задачу', 'task', (
          SELECT id FROM users WHERE username = 'default_user'
        ))`, (err) => {
          if (err) console.error('Error inserting achievement:', err);
        });
    }
    
    // Проверяем достижение "Боец XP" (набрать 100 XP)
    db.get(`SELECT xp FROM users WHERE username = 'default_user'`, (err, user) => {
      if (err || !user) return;
      
      if (user.xp >= 100) {
        db.run(`INSERT OR IGNORE INTO achievements (name, description, icon, user_id) 
          VALUES ('Боец XP', 'Наберите 100 XP', 'star', (
            SELECT id FROM users WHERE username = 'default_user'
          ))`, (err) => {
            if (err) console.error('Error inserting achievement:', err);
          });
      }
      
      // Проверяем достижение "Марафонец" (выполнить 10 задач)
      if (result.count >= 10) {
        db.run(`INSERT OR IGNORE INTO achievements (name, description, icon, user_id) 
          VALUES ('Марафонец', 'Выполните 10 задач', 'runner', (
            SELECT id FROM users WHERE username = 'default_user'
          ))`, (err) => {
            if (err) console.error('Error inserting achievement:', err);
          });
      }
    });
  });
}