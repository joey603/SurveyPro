declare module '@dnd-kit/core' {
  export interface DragEndEvent {
    active: { id: string };
    over?: { id: string } | null;
  }

  export const DndContext: any;
  export const closestCenter: any;
  export const KeyboardSensor: any;
  export const PointerSensor: any;
  export const useSensor: any;
  export const useSensors: any;
}

declare module '@dnd-kit/sortable' {
  export const arrayMove: any;
  export const SortableContext: any;
  export const sortableKeyboardCoordinates: any;
  export const useSortable: any;
  export const verticalListSortingStrategy: any;
}

declare module '@dnd-kit/utilities' {
  export const CSS: any;
} 