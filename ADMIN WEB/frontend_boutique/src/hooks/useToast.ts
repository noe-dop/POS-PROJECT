// src/hooks/useToast.ts
import toast, { ToastOptions } from 'react-hot-toast';

export interface ToastConfig {
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const useToast = () => {
  const showToast = (config: ToastConfig | string) => {
    if (typeof config === 'string') {
      toast(config);
      return;
    }

    const { title, description, type = 'info', duration = 4000 } = config;
    
    const options: ToastOptions = {
      duration,
      position: 'top-right',
    };

    const message = description ? `${title}: ${description}` : title;

    switch (type) {
      case 'success':
        toast.success(message, options);
        break;
      case 'error':
        toast.error(message, options);
        break;
      case 'warning':
        toast(message, {
          ...options,
          icon: '⚠️',
        });
        break;
      default:
        toast(message, options);
    }
  };

  return { showToast };
};