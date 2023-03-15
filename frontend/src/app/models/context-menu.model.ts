import { Position } from './position.model';

export const contextMenuStateKey = 'ContextMenuState';

export interface ContextMenu {
  items: ContextMenuItem[];
  position: Position;
}

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  event: () => void;
  subMenu?: ContextMenu;
}

