import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function TablePagination({ 
  totalItems, 
  pageSize, 
  setPageSize, 
  currentPage, 
  setCurrentPage 
}: any) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 bg-muted/5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Show by</span>
        <select 
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="bg-transparent border border-border/50 rounded px-1 py-0.5 text-foreground font-medium outline-none"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
        <button 
          onClick={(e) => { e.stopPropagation(); setCurrentPage((p: number) => Math.max(1, p - 1)); }}
          disabled={currentPage === 1}
          className="p-1 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={16} />
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); setCurrentPage((p: number) => Math.min(totalPages, p + 1)); }}
          disabled={currentPage === totalPages}
          className="p-1 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
