"use client";

import { useNotification, type Notification } from "@/context/NotificationContext";

const notificationConfig = {
  success: {
    icon: "✓",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-800",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  error: {
    icon: "✕",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-800",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  warning: {
    icon: "⚠",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-800",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  info: {
    icon: "ⓘ",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
};

interface NotificationItemProps {
  notification: Notification;
  onClose: (id: string) => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const config = notificationConfig[notification.type];

  return (
    <div
      className={`${config.bgColor} border ${config.borderColor} ${config.textColor} rounded-lg p-4 mb-3 flex items-start gap-3 shadow-md animate-slideIn`}
    >
      <div
        className={`${config.iconBg} ${config.iconColor} w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm -shrink-0`}
      >
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{notification.title}</p>
        <p className="text-sm opacity-90 mt-0.5">{notification.message}</p>
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className={`${config.iconColor} hover:opacity-70 transition -shrink-0 mt-1`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md pointer-events-auto">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}
