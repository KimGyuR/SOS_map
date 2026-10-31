import type { Complaint } from './types';
import type { MapCoordinate, MapRegion } from '../components/ComplaintMap.types';

export type ComplaintState = {
  complaints: Complaint[];
  likedComplaintIds: ReadonlySet<string>;
  selectedId: string | null;
};
export type ComplaintAction =
  | { type: 'add'; complaint: Complaint; }
  | { type: 'toggleLike'; id: string; }
  | { type: 'select'; id: string | null; };

export function createComplaintState(complaints: Complaint[]): ComplaintState {
  return { complaints, likedComplaintIds: new Set(), selectedId: null };
}

export function complaintReducer(state: ComplaintState, action: ComplaintAction): ComplaintState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };
    case 'add':
      if (state.complaints.some((item) => item.id === action.complaint.id)) return state;
      return { ...state, complaints: [action.complaint, ...state.complaints], selectedId: null };
    case 'toggleLike': {
      if (!state.complaints.some((item) => item.id === action.id)) return state;
      const wasLiked = state.likedComplaintIds.has(action.id);
      const likedComplaintIds = new Set(state.likedComplaintIds);
      if (wasLiked) likedComplaintIds.delete(action.id);
      else likedComplaintIds.add(action.id);
      return {
        ...state, likedComplaintIds,
        complaints: state.complaints.map((item) => item.id === action.id
          ? { ...item, likeCount: Math.max(0, item.likeCount + (wasLiked ? -1 : 1)) } : item),
      };
    }
  }
}

/** Normalize longitude distance so panning across the date line still works. */
export function isWithinRegion(coordinate: MapCoordinate, region: MapRegion): boolean {
  const longitudeDistance = Math.abs(((coordinate.longitude - region.longitude + 540) % 360 + 360) % 360 - 180);
  return Math.abs(coordinate.latitude - region.latitude) <= region.latitudeDelta / 2 &&
    (region.longitudeDelta >= 360 || longitudeDistance <= region.longitudeDelta / 2);
}
