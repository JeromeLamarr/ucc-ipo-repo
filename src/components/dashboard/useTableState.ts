import { useState, useEffect, useMemo } from 'react';

export interface TableStateOptions<T> {
  data: T[];
  searchFields?: (item: T) => string[];
  initialItemsPerPage?: number;
}

export function useTableState<T>({ data, searchFields, initialItemsPerPage = 10 }: TableStateOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchFields) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((item) => {
      const fields = searchFields(item);
      return fields.some((field) => field.toLowerCase().includes(lowerSearch));
    });
  }, [data, searchTerm, searchFields]);

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleItemsPerPageChange = (count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1);
  };

  return {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage: handleItemsPerPageChange,
    filteredData,
    paginatedData,
    totalPages,
    totalItems: filteredData.length,
  };
}
