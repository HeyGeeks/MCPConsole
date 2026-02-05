# Shared Hooks

This directory contains common React hooks used across multiple features in the application.

## Available Hooks

### `useIsMobile`
Detects if the current viewport is mobile-sized (< 768px).

```tsx
import { useIsMobile } from '@/shared/hooks';

function MyComponent() {
  const isMobile = useIsMobile();
  return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>;
}
```

### `useToast`
Provides toast notification functionality.

```tsx
import { useToast } from '@/shared/hooks';

function MyComponent() {
  const { toast } = useToast();
  
  const showNotification = () => {
    toast({
      title: 'Success',
      description: 'Operation completed',
      variant: 'default'
    });
  };
  
  return <button onClick={showNotification}>Show Toast</button>;
}
```

### `useLocalStorage`
Manages state synchronized with localStorage.

```tsx
import { useLocalStorage } from '@/shared/hooks';

function MyComponent() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </button>
  );
}
```

## Migration Notes

These hooks were extracted from various locations in the codebase:
- `useIsMobile` - from `src/hooks/use-mobile.tsx`
- `useToast` - from `src/hooks/use-toast.ts`
- `useLocalStorage` - from `src/lib/hooks/use-local-storage.ts`

The old locations now re-export from this shared location for backward compatibility during the migration period.

## Guidelines

- **Feature-specific hooks** should be placed in their respective feature directories (e.g., `src/features/chat/hooks/`)
- **Shared hooks** used by multiple features belong here
- All hooks should be properly documented with JSDoc comments
- Include usage examples in the documentation
