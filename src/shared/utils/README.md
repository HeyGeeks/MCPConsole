# Shared Utilities

This directory contains common utility functions used across multiple features in the application.

## Available Utilities

### Class Name Utilities (`cn.ts`)

#### `cn(...inputs)`
Merges Tailwind CSS classes with proper deduplication.

```tsx
import { cn } from '@/shared/utils';

<div className={cn('px-4 py-2', isActive && 'bg-blue-500')} />
```

### Formatting Utilities (`format.ts`)

#### `formatDate(date, options?)`
Formats dates to human-readable strings.

```ts
import { formatDate } from '@/shared/utils';

formatDate(new Date()); // "Jan 1, 2024"
```

#### `formatNumber(num, options?)`
Formats numbers with thousand separators.

```ts
import { formatNumber } from '@/shared/utils';

formatNumber(1234567); // "1,234,567"
```

#### `truncate(str, maxLength, suffix?)`
Truncates strings with ellipsis.

```ts
import { truncate } from '@/shared/utils';

truncate('This is a long string', 10); // "This is a..."
```

#### `capitalize(str)`
Capitalizes the first letter of a string.

```ts
import { capitalize } from '@/shared/utils';

capitalize('hello world'); // "Hello world"
```

#### `toKebabCase(str)` / `toCamelCase(str)`
Converts strings between naming conventions.

```ts
import { toKebabCase, toCamelCase } from '@/shared/utils';

toKebabCase('Hello World'); // "hello-world"
toCamelCase('hello-world'); // "helloWorld"
```

### Validation Utilities (`validation.ts`)

#### `isValidEmail(email)`
Validates email addresses.

```ts
import { isValidEmail } from '@/shared/utils';

isValidEmail('user@example.com'); // true
```

#### `isValidUrl(url)`
Validates URLs.

```ts
import { isValidUrl } from '@/shared/utils';

isValidUrl('https://example.com'); // true
```

#### `isEmpty(value)`
Checks if a value is empty.

```ts
import { isEmpty } from '@/shared/utils';

isEmpty(''); // true
isEmpty([]); // true
isEmpty({}); // true
```

#### `isValidJson(str)`
Validates JSON strings.

```ts
import { isValidJson } from '@/shared/utils';

isValidJson('{"key": "value"}'); // true
```

#### `isInRange(num, min, max)`
Checks if a number is within a range.

```ts
import { isInRange } from '@/shared/utils';

isInRange(5, 1, 10); // true
```

### Async Utilities (`async.ts`)

#### `delay(ms)`
Delays execution for a specified time.

```ts
import { delay } from '@/shared/utils';

await delay(1000); // Wait 1 second
```

#### `retry(fn, options?)`
Retries an async function with exponential backoff.

```ts
import { retry } from '@/shared/utils';

const result = await retry(
  () => fetch('/api/data'),
  { maxAttempts: 3, delayMs: 1000 }
);
```

#### `withTimeout(fn, timeoutMs)`
Executes an async function with a timeout.

```ts
import { withTimeout } from '@/shared/utils';

const result = await withTimeout(
  () => fetch('/api/slow-endpoint'),
  5000
);
```

#### `debounce(fn, delayMs)`
Debounces an async function.

```ts
import { debounce } from '@/shared/utils';

const debouncedSearch = debounce(
  async (query: string) => fetch(`/api/search?q=${query}`),
  300
);
```

#### `throttle(fn, limitMs)`
Throttles an async function.

```ts
import { throttle } from '@/shared/utils';

const throttledSave = throttle(
  async (data: any) => fetch('/api/save', { method: 'POST', body: JSON.stringify(data) }),
  1000
);
```

## Migration Notes

The `cn` utility was extracted from `src/lib/utils.ts`. The old location now re-exports from this shared location for backward compatibility.

## Guidelines

- **Feature-specific utilities** should be placed in their respective feature directories
- **Shared utilities** used by multiple features belong here
- All utilities should be pure functions when possible
- Include comprehensive JSDoc comments with examples
- Write unit tests for all utility functions
