import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notifications', () => {
    const notifications = ref([])
    let nextId = 1

    function addNotification({ type = 'info', title, message, duration = 5000, actions = [], persistent = false }) {
        const notification = {
            id: nextId++,
            type,
            title,
            message,
            timestamp: Date.now(),
            actions,
            persistent
        }

        notifications.value.push(notification)

        if (duration > 0 && !persistent) {
            setTimeout(() => {
                removeNotification(notification.id)
            }, duration)
        }

        return notification.id
    }

    function removeNotification(id) {
        const index = notifications.value.findIndex(n => n.id === id)
        if (index > -1) {
            notifications.value.splice(index, 1)
        }
    }

    function clearAll() {
        notifications.value = []
    }

    // Convenience methods
    function success(title, message, duration, actions) {
        return addNotification({ type: 'success', title, message, duration, actions })
    }

    function error(title, message, duration, actions) {
        return addNotification({ type: 'error', title, message, duration, actions })
    }

    function warning(title, message, duration, actions) {
        return addNotification({ type: 'warning', title, message, duration, actions })
    }

    function info(title, message, duration, actions) {
        return addNotification({ type: 'info', title, message, duration, actions })
    }

    function persistentSuccess(title, message, actions = []) {
        return addNotification({ type: 'success', title, message, duration: 0, actions, persistent: true })
    }

    return {
        notifications,
        addNotification,
        removeNotification,
        clearAll,
        success,
        error,
        warning,
        info,
        persistentSuccess
    }
})
