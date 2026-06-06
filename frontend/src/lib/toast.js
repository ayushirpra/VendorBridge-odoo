import toast from 'react-hot-toast';

/**
 * Toast notification utilities
 */

const toastConfig = {
  duration: 4000,
  position: 'top-right',
  style: {
    borderRadius: '8px',
    background: '#fff',
    color: '#111827',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    padding: '12px 16px',
    fontSize: '14px',
    maxWidth: '400px'
  }
};

export const showSuccess = (message) => {
  toast.success(message, {
    ...toastConfig,
    icon: '✓',
    style: {
      ...toastConfig.style,
      border: '1px solid #16a34a',
    },
    iconTheme: {
      primary: '#16a34a',
      secondary: '#fff',
    }
  });
};

export const showError = (message) => {
  toast.error(message, {
    ...toastConfig,
    icon: '✕',
    style: {
      ...toastConfig.style,
      border: '1px solid #dc2626',
    },
    iconTheme: {
      primary: '#dc2626',
      secondary: '#fff',
    }
  });
};

export const showInfo = (message) => {
  toast(message, {
    ...toastConfig,
    icon: 'ℹ',
    style: {
      ...toastConfig.style,
      border: '1px solid #2563eb',
    }
  });
};

export const showWarning = (message) => {
  toast(message, {
    ...toastConfig,
    icon: '⚠',
    style: {
      ...toastConfig.style,
      border: '1px solid #d97706',
    }
  });
};

export const showLoading = (message) => {
  return toast.loading(message, {
    ...toastConfig,
    style: {
      ...toastConfig.style,
      border: '1px solid #6b7280',
    }
  });
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = () => {
  toast.dismiss();
};
