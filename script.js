document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const elements = {
        taskInput: document.getElementById('taskInput'),
        addTaskBtn: document.getElementById('addTaskBtn'),
        taskList: document.getElementById('taskList'),
        filterBtns: document.querySelectorAll('.filter-btn'),
        sortBtns: document.querySelectorAll('.sort-btn'),
        searchInput: document.getElementById('searchInput'),
        clearCompletedBtn: document.getElementById('clearCompleted'),
        saveCloudBtn: document.getElementById('saveCloudBtn'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        timeDisplay: document.getElementById('time'),
        dateDisplay: document.getElementById('date'),
        completeSound: document.getElementById('completeSound'),
        deleteSound: document.getElementById('deleteSound'),
        notifySound: document.getElementById('notifySound')
    };

    // State
    let state = {
        tasks: JSON.parse(localStorage.getItem('tasks')) || [],
        currentFilter: 'all',
        currentSort: 'newest',
        searchQuery: '',
        darkMode: localStorage.getItem('darkMode') === 'true'
    };

    // Initialize
    function init() {
        renderDateTime();
        setInterval(renderDateTime, 1000);
        
        applyDarkMode();
        renderTasks();
        setupEventListeners();
    }

    // DateTime Rendering
    function renderDateTime() {
        const now = new Date();
        elements.timeDisplay.textContent = now.toLocaleTimeString();
        elements.dateDisplay.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // Dark Mode Toggle
    function toggleDarkMode() {
        state.darkMode = !state.darkMode;
        localStorage.setItem('darkMode', state.darkMode);
        applyDarkMode();
    }

    function applyDarkMode() {
        if (state.darkMode) {
            document.body.classList.add('dark-mode');
            elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Light';
        } else {
            document.body.classList.remove('dark-mode');
            elements.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark';
        }
    }

    // Task Management
    function addTask() {
        const text = elements.taskInput.value.trim();
        if (!text) {
            showInputError("Task can't be empty!");
            return;
        }

        const newTask = {
            id: Date.now(),
            text,
            completed: false,
            priority: false,
            dueDate: null,
            createdAt: new Date().toISOString()
        };

        state.tasks.unshift(newTask);
        saveTasks();
        elements.taskInput.value = '';
        renderTasks();
        playSound(elements.notifySound);
        
        // Animation feedback
        animateButton(elements.addTaskBtn);
    }

    function toggleTaskCompletion(taskId) {
        state.tasks = state.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        saveTasks();
        renderTasks();
        playSound(elements.completeSound);
    }

    function toggleTaskPriority(taskId) {
        state.tasks = state.tasks.map(task => 
            task.id === taskId ? { ...task, priority: !task.priority } : task
        );
        saveTasks();
        renderTasks();
        playSound(elements.notifySound);
    }

    function editTask(taskId, currentText) {
        const newText = prompt('Edit your task:', currentText);
        if (newText !== null && newText.trim() !== '') {
            state.tasks = state.tasks.map(task => 
                task.id === taskId ? { ...task, text: newText.trim() } : task
            );
            saveTasks();
            renderTasks();
        }
    }

    function setDueDate(taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        const currentDate = task.dueDate ? new Date(task.dueDate) : new Date();
        
        // Create a date string in YYYY-MM-DD format for the input
        const dateString = currentDate.toISOString().split('T')[0];
        
        const newDate = prompt('Set due date (YYYY-MM-DD):', dateString);
        if (newDate) {
            try {
                const dueDate = new Date(newDate);
                if (!isNaN(dueDate.getTime())) {
                    state.tasks = state.tasks.map(task => 
                        task.id === taskId ? { ...task, dueDate: dueDate.toISOString() } : task
                    );
                    saveTasks();
                    renderTasks();
                } else {
                    alert('Invalid date format!');
                }
            } catch (e) {
                alert('Invalid date format!');
            }
        }
    }

    function deleteTask(taskElement, taskId) {
        taskElement.classList.add('fade-out');
        playSound(elements.deleteSound);
        
        setTimeout(() => {
            state.tasks = state.tasks.filter(task => task.id !== taskId);
            saveTasks();
            renderTasks();
        }, 300);
    }

    function clearCompletedTasks() {
        state.tasks = state.tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
        animateButton(elements.clearCompletedBtn);
    }

    // Filtering & Sorting
    function filterTasks() {
        let filteredTasks = [...state.tasks];
        
        // Apply search filter
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            filteredTasks = filteredTasks.filter(task => 
                task.text.toLowerCase().includes(query)
            );
        }
        
        // Apply status filter
        switch(state.currentFilter) {
            case 'active':
                return filteredTasks.filter(task => !task.completed);
            case 'completed':
                return filteredTasks.filter(task => task.completed);
            case 'priority':
                return filteredTasks.filter(task => task.priority);
            default:
                return filteredTasks;
        }
    }

    function sortTasks(tasks) {
        switch(state.currentSort) {
            case 'newest':
                return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'oldest':
                return tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'priority':
                return tasks.sort((a, b) => (b.priority - a.priority) || (new Date(b.createdAt) - new Date(a.createdAt)));
            case 'due':
                return tasks.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
            default:
                return tasks;
        }
    }

    // Rendering
    function renderTasks() {
        const filteredTasks = filterTasks();
        const sortedTasks = sortTasks(filteredTasks);
        
        elements.taskList.innerHTML = '';
        
        if (sortedTasks.length === 0) {
            elements.taskList.innerHTML = '<p class="empty-message">No tasks found</p>';
        } else {
            sortedTasks.forEach(task => {
                const taskItem = document.createElement('li');
                taskItem.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority ? 'priority' : ''}`;
                taskItem.dataset.id = task.id;
                
                // Format due date
                let dueDateText = '';
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const dueDateFormatted = dueDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                    
                    if (dueDate < today && !task.completed) {
                        dueDateText = `<span class="task-due" style="color: var(--danger)">Overdue: ${dueDateFormatted}</span>`;
                    } else {
                        dueDateText = `<span class="task-due">Due: ${dueDateFormatted}</span>`;
                    }
                }
                
                taskItem.innerHTML = `
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-text">
                        ${task.priority ? '<i class="fas fa-star priority-star"></i>' : ''}
                        ${task.text}
                    </span>
                    ${dueDateText}
                    <div class="task-actions">
                        <button class="priority-btn" title="${task.priority ? 'Remove priority' : 'Mark as priority'}">
                            <i class="fas ${task.priority ? 'fa-star' : 'fa-star'}"></i>
                        </button>
                        <button class="due-date-btn" title="Set due date"><i class="fas fa-calendar-day"></i></button>
                        <button class="edit-btn" title="Edit task"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" title="Delete task"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                elements.taskList.appendChild(taskItem);
            });
        }
        
        updateCounters();
        updateProgress();
    }

    function updateCounters() {
        const allCount = state.tasks.length;
        const activeCount = state.tasks.filter(task => !task.completed).length;
        const completedCount = state.tasks.filter(task => task.completed).length;
        const priorityCount = state.tasks.filter(task => task.priority && !task.completed).length;
        
        document.querySelector('[data-filter="all"] .counter').textContent = allCount;
        document.querySelector('[data-filter="active"] .counter').textContent = activeCount;
        document.querySelector('[data-filter="completed"] .counter').textContent = completedCount;
        document.querySelector('[data-filter="priority"] .counter').textContent = priorityCount;
    }

    function updateProgress() {
        const totalTasks = state.tasks.length;
        const completedTasks = state.tasks.filter(task => task.completed).length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        elements.progressBar.innerHTML = `<div style="width: ${progress}%"></div>`;
        elements.progressText.textContent = `${progress}% Complete`;
    }

    // Storage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(state.tasks));
        
        // Simulate cloud save with animation
        if (navigator.onLine) {
            animateButton(elements.saveCloudBtn);
            elements.saveCloudBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
            setTimeout(() => {
                elements.saveCloudBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save';
            }, 2000);
        }
    }

    // UI Helpers
    function showInputError(message) {
        elements.taskInput.placeholder = message;
        elements.taskInput.style.border = '1px solid var(--danger)';
        elements.taskInput.classList.add('shake');
        
        setTimeout(() => {
            elements.taskInput.placeholder = "What needs to be done?";
            elements.taskInput.style.border = '';
            elements.taskInput.classList.remove('shake');
        }, 2000);
    }

    function animateButton(button) {
        button.classList.add('pulse');
        setTimeout(() => button.classList.remove('pulse'), 500);
    }

    function playSound(audioElement) {
        if (localStorage.getItem('soundsEnabled') !== 'false') {
            audioElement.currentTime = 0;
            audioElement.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    // Event Listeners
    function setupEventListeners() {
        // Add task
        elements.addTaskBtn.addEventListener('click', addTask);
        elements.taskInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') addTask();
        });
        
        // Filter buttons
        elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.filter;
                renderTasks();
            });
        });
        
        // Sort buttons
        elements.sortBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.sortBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentSort = btn.dataset.sort;
                renderTasks();
            });
        });
        
        // Search
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            renderTasks();
        });
        
        // Task actions
        elements.taskList.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            
            const taskId = Number(taskItem.dataset.id);
            const task = state.tasks.find(t => t.id === taskId);
            
            if (e.target.classList.contains('task-checkbox') || e.target.classList.contains('task-text')) {
                toggleTaskCompletion(taskId);
            } else if (e.target.closest('.priority-btn')) {
                toggleTaskPriority(taskId);
            } else if (e.target.closest('.due-date-btn')) {
                setDueDate(taskId);
            } else if (e.target.closest('.edit-btn')) {
                editTask(taskId, task.text);
            } else if (e.target.closest('.delete-btn')) {
                deleteTask(taskItem, taskId);
            }
        });
        
        // Clear completed
        elements.clearCompletedBtn.addEventListener('click', clearCompletedTasks);
        
        // Dark mode toggle
        elements.darkModeToggle.addEventListener('click', toggleDarkMode);
        
        // Cloud save (simulated)
        elements.saveCloudBtn.addEventListener('click', () => {
            saveTasks();
            animateButton(elements.saveCloudBtn);
        });
    }

    // Start the app
    init();
});