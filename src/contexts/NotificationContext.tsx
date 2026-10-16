import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  type: 'order_update' | 'system' | 'promo';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'merchant_notifications';
const READ_KEY = 'merchant_notifications_read';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load read states from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(READ_KEY);
    if (stored) {
      try {
        setReadIds(new Set(JSON.parse(stored)));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save read states to localStorage
  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify([...readIds]));
  }, [readIds]);

  // Subscribe to order status changes
  useEffect(() => {
    if (!user) return;

    // Fetch initial order status history for notifications
    const fetchOrderNotifications = async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, status, updated_at, customer_name')
        .eq('merchant_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (orders) {
        const orderNotifications: Notification[] = orders.map(order => ({
          id: `order-${order.id}-${order.status}`,
          type: 'order_update' as const,
          title: getStatusTitle(order.status),
          body: `الطلب ${order.order_number} - ${order.customer_name}`,
          data: { orderId: order.id, status: order.status },
          isRead: readIds.has(`order-${order.id}-${order.status}`),
          createdAt: new Date(order.updated_at),
        }));
        setNotifications(orderNotifications);
      }
    };

    fetchOrderNotifications();

    // Subscribe to real-time order changes
    const channel = supabase
      .channel('order-status-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${user.id}`,
        },
        (payload) => {
          const order = payload.new as { id: string; order_number: string; status: string; customer_name: string };
          const newNotification: Notification = {
            id: `order-${order.id}-${order.status}-${Date.now()}`,
            type: 'order_update',
            title: getStatusTitle(order.status),
            body: `الطلب ${order.order_number} - ${order.customer_name}`,
            data: { orderId: order.id, status: order.status },
            isRead: false,
            createdAt: new Date(),
          };
          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, readIds]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => new Set([...prev, id]));
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    setReadIds(prev => new Set([...prev, ...allIds]));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

function getStatusTitle(status: string | null): string {
  switch (status) {
    case 'pending': return '📦 قيد المراجعة';
    case 'processing': return '✅ تمت الموافقة';
    case 'printed': return '📦 تم التجهيز';
    case 'shipped': return '🚚 تم الشحن';
    case 'delivered': return '✅ تم التسليم';
    case 'returned': return '↩️ راجع';
    case 'cancelled': return '⏸️ مؤجل';
    default: return '📋 تحديث الطلب';
  }
}
