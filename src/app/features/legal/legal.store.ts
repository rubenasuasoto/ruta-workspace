import { Injectable, inject, signal } from '@angular/core';
import { Api } from '../../api/api';
import { legalControllerDocuments } from '../../api/fn/legal/legal-controller-documents';
import { LegalDocumentDto } from '../../api/models/legal-document-dto';

@Injectable({ providedIn: 'root' })
export class LegalStore {
  private readonly api = inject(Api);
  readonly documents = signal<LegalDocumentDto[]>([]);
  readonly currentVersion = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    if (this.documents().length) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await this.api.invoke(legalControllerDocuments);
      this.documents.set(response.documents);
      this.currentVersion.set(response.currentVersion);
    } catch {
      this.error.set('No se pudieron cargar los documentos legales.');
    } finally {
      this.loading.set(false);
    }
  }

  document(key: string): LegalDocumentDto | undefined {
    return this.documents().find((document) => document.key === key);
  }
}
