import { createContext, useContext } from 'react'
import type { Brand, Content, Page, Snapshot } from './types'
export interface WorkspaceContextValue {
  data: Snapshot; brand: Brand | undefined; contents: Content[]; refresh: () => Promise<void>;
  page: Page; navigate: (page: Page) => void; selectBrand: (id: string) => void;
  edit: (item: Content) => void; addBrand: () => void
  weekPlanRequested: boolean; planWeek: () => void; clearWeekPlan: () => void
}
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
export function useWorkspace() { const context = useContext(WorkspaceContext); if (!context) throw new Error('Workspace unavailable'); return context }
