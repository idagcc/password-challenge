import type { ReactNode } from 'react';
export interface DesignProps { values?: Record<string, ReactNode>; onNext?: () => void; disabled?: boolean }
