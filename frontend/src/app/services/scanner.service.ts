import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

import { environment } from '@env/environment';
import { ScannerEvent } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ScannerService implements OnDestroy {
  private es: EventSource | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly barcode$ = new Subject<string>();
  readonly temperature$ = new Subject<{ value: number; unit: string }>();
  readonly event$ = new Subject<ScannerEvent>();
  readonly connected$ = new BehaviorSubject<boolean>(false);

  lastTemp: number | null = null;
  lastEventAt: Date | null = null;

  get bridgeOnline(): boolean {
    return !!this.lastEventAt && Date.now() - this.lastEventAt.getTime() < 90_000;
  }

  constructor(private readonly zone: NgZone) {
    this.connect();
  }

  private connect(): void {
    if (this.es) {
      this.es.close();
    }
    this.es = new EventSource(`${environment.apiUrl}/scanner/stream`);

    this.es.onopen = () => this.zone.run(() => this.connected$.next(true));

    this.es.onmessage = (msg) => {
      this.zone.run(() => {
        try {
          const event: ScannerEvent = JSON.parse(msg.data);
          this.lastEventAt = new Date();
          this.event$.next(event);

          if (event.type === 'barcode' && event.data) {
            this.barcode$.next(event.data);
          }
          if (event.type === 'temp' && event.value !== undefined) {
            this.lastTemp = Number(event.value);
            this.temperature$.next({ value: this.lastTemp, unit: event.unit ?? 'C' });
          }
        } catch { /* ignorar mensajes malformados */ }
      });
    };

    this.es.onerror = () => {
      this.zone.run(() => {
        this.connected$.next(false);
        this.es?.close();
        this.es = null;
        this.retryTimer = setTimeout(() => this.connect(), 5000);
      });
    };
  }

  ngOnDestroy(): void {
    if (this.retryTimer) { clearTimeout(this.retryTimer); }
    this.es?.close();
  }
}
