import { useCallback, useMemo, useReducer } from 'react';
import type { Complaint } from '../domain/types';
import { INITIAL_COMPLAINTS, getCategory } from '../domain/catalog';
import { complaintReducer, createComplaintState } from '../domain/complaintState';

export function useComplaints() {
  const [state, dispatch] = useReducer(complaintReducer, INITIAL_COMPLAINTS, createComplaintState);
  // Keep only an ID in selection state; cards and detail always read the same record.
  const selectedComplaint = state.complaints.find((item) => item.id === state.selectedId) ?? null;
  const setSelectedComplaint = useCallback((item: Complaint | null) => dispatch({ type: 'select', id: item?.id ?? null }), []);
  const selectComplaintById = useCallback((id: string) => dispatch({ type: 'select', id }), []);
  const toggleLike = useCallback((id: string) => dispatch({ type: 'toggleLike', id }), []);
  const addComplaint = useCallback((complaint: Complaint) => dispatch({ type: 'add', complaint }), []);
  const mapComplaints = useMemo(() => state.complaints.map((item) => {
    const category = getCategory(item.category);
    return {
      id: item.id,
      title: item.title,
      coordinate: { latitude: item.latitude, longitude: item.longitude },
      icon: category.icon,
      color: category.color,
    };
  }), [state.complaints]);
  return { ...state, selectedComplaint, setSelectedComplaint, selectComplaintById, toggleLike, addComplaint, mapComplaints };
}
