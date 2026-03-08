import { ReactNode, RefObject } from "react";

type Props = {
  isFiltersOpen: boolean;
  title: string;
  closeLabel: string;
  filtersCloseRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
};

export function QuickSearchAdvancedFilters({
  isFiltersOpen,
  title,
  closeLabel,
  filtersCloseRef,
  onClose,
  children,
}: Props) {
  return (
    <aside
      id="qs-filters-drawer"
      role="dialog"
      aria-modal={isFiltersOpen}
      aria-label={title}
      className={`panel panel-soft qs-filters-panel ${isFiltersOpen ? "open" : ""}`}
    >
      <div className="qs-filters-header">
        <div>
          <h2>{title}</h2>
        </div>
        <button
          type="button"
          className="btn-ghost qs-filters-close"
          aria-label={closeLabel}
          ref={filtersCloseRef}
          onClick={onClose}
        >
          {closeLabel}
        </button>
      </div>
      {children}
    </aside>
  );
}
