import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api } from '../../api/api';

export interface TripShare {
  id: string;
  showSummary: boolean;
  showDates: boolean;
  showMap: boolean;
  dayIds: string[];
  placeIds: string[];
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
  recipients: { id: string; email: string; name: string }[];
}

export interface SharedTrip {
  id: string;
  expiresAt: string;
  summary: {
    destination: string;
    country: string;
    description: string;
    coverImage: string | null;
  } | null;
  dates: { startDate: string; endDate: string } | null;
  days: {
    id: string;
    date: string;
    activities: {
      id: string;
      title: string;
      time: string;
      kind: string;
      position: number;
      locationName?: string | null;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }[];
  }[];
  places: {
    id: string;
    name: string;
    city: string;
    country: string;
    category: string;
    image: string | null;
    address?: string | null;
  }[];
  mapEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class SharingApi {
  private readonly http = inject(HttpClient);
  private readonly api = inject(Api);

  list(tripId: string): Promise<TripShare[]> {
    return firstValueFrom(this.http.get<TripShare[]>(this.url(`/trips/${tripId}/shares`)));
  }

  create(
    tripId: string,
    body: {
      showSummary: boolean;
      showDates: boolean;
      showMap: boolean;
      dayIds: string[];
      placeIds: string[];
      recipientEmails: string[];
    },
  ): Promise<TripShare> {
    return firstValueFrom(this.http.post<TripShare>(this.url(`/trips/${tripId}/shares`), body));
  }

  renew(tripId: string, shareId: string): Promise<TripShare> {
    return firstValueFrom(
      this.http.post<TripShare>(this.url(`/trips/${tripId}/shares/${shareId}/renew`), {}),
    );
  }

  revoke(tripId: string, shareId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.url(`/trips/${tripId}/shares/${shareId}`)));
  }

  privateView(shareId: string): Promise<SharedTrip> {
    return firstValueFrom(
      this.http.get<SharedTrip>(this.url(`/shared-trips/${encodeURIComponent(shareId)}`)),
    );
  }

  private url(path: string) {
    return `${this.api.rootUrl.replace(/\/$/, '')}${path}`;
  }
}
