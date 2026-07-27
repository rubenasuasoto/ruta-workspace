import { Component, input, output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../api/api';
import { mediaControllerImportOpenverse } from '../../api/fn/media/media-controller-import-openverse';
import { mediaControllerSearch } from '../../api/fn/media/media-controller-search';
import { mediaControllerUpload } from '../../api/fn/media/media-controller-upload';
import { MediaAssetResponseDto } from '../../api/models/media-asset-response-dto';
import { MediaSearchResultDto } from '../../api/models/media-search-result-dto';

export interface MediaSelection {
  assetId: string | null;
  url: string | null;
}

@Component({
  selector: 'app-media-picker',
  imports: [FormsModule],
  template: `
    <section class="media-picker" aria-labelledby="media-picker-title">
      <div class="media-heading">
        <div>
          <h3 id="media-picker-title">Imagen opcional</h3>
          <p>Sube una imagen propia o busca material CC0/dominio público.</p>
        </div>
        @if (preview()) {
          <button type="button" class="text-button" (click)="clear()">Quitar imagen</button>
        }
      </div>

      @if (preview()) {
        <figure class="preview">
          <img [src]="preview()" alt="Previsualización de la imagen seleccionada" />
          @if (asset()?.source === 'openverse') {
            <figcaption>
              {{ asset()?.title || 'Openverse' }}
              @if (asset()?.creator) { · {{ asset()?.creator }} }
              · {{ asset()?.license?.toUpperCase() }}
            </figcaption>
          }
        </figure>
      } @else {
        <div class="placeholder" aria-label="Sin imagen">
          <span aria-hidden="true">◇</span>
          <p>El lugar se mostrará con un marcador visual neutro.</p>
        </div>
      }

      <div class="media-tabs" role="tablist" aria-label="Origen de la imagen">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="mode() === 'upload'"
          [class.active]="mode() === 'upload'"
          (click)="mode.set('upload')"
        >
          Imagen propia
        </button>
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="mode() === 'search'"
          [class.active]="mode() === 'search'"
          (click)="mode.set('search')"
        >
          Buscar libre
        </button>
      </div>

      @if (mode() === 'upload') {
        <div class="upload-panel">
          <label class="file-button">
            <span>Seleccionar JPEG, PNG o WebP</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              (change)="chooseFile($event)"
            />
          </label>
          <label class="rights">
            <input type="checkbox" [(ngModel)]="rightsConfirmed" />
            <span>
              Declaro que soy autor/a o tengo permiso y que respeto los derechos
              de las personas que aparecen.
            </span>
          </label>
          <button
            class="button secondary small"
            type="button"
            [disabled]="!file() || !rightsConfirmed || busy()"
            (click)="upload()"
          >
            {{ busy() ? 'Procesando…' : 'Usar esta imagen' }}
          </button>
          <small>Máximo 8 MB y 24 MP. Ruta elimina EXIF y GPS; no conserva el original.</small>
        </div>
      } @else {
        <form class="search-panel" (ngSubmit)="search()">
          <label for="media-query">Consulta de Openverse</label>
          <div>
            <input
              id="media-query"
              name="media-query"
              [(ngModel)]="query"
              minlength="3"
              maxlength="200"
              placeholder="Ej. Alhambra Granada España"
            />
            <button class="button secondary small" [disabled]="busy() || query.trim().length < 3">
              Buscar
            </button>
          </div>
        </form>
        @if (results().length) {
          <div class="results" aria-live="polite">
            @for (result of results(); track result.id) {
              <article>
                <img [src]="absolute(result.thumbnailUrl)" alt="" loading="lazy" referrerpolicy="no-referrer" />
                <div>
                  <strong>{{ result.title }}</strong>
                  <small>{{ result.creator || 'Autor no indicado' }} · {{ result.license.toUpperCase() }}</small>
                  <a [href]="result.sourceUrl" target="_blank" rel="noopener noreferrer">
                    Verificar ficha
                  </a>
                  <button
                    type="button"
                    class="button secondary small"
                    [disabled]="busy()"
                    (click)="importResult(result)"
                  >
                    Seleccionar
                  </button>
                </div>
              </article>
            }
          </div>
          <p class="license-note">
            Openverse no garantiza la exactitud de la licencia. Revisa la ficha:
            CC0/PDM tampoco descarta derechos de imagen, marcas o privacidad.
          </p>
        }
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </section>
  `,
  styles: `
    .media-picker{border:1px solid var(--line);border-radius:1rem;padding:1rem}.media-heading{align-items:flex-start;display:flex;justify-content:space-between}.media-heading h3{font-size:1.3rem;margin:0}.media-heading p,.upload-panel small,.license-note{color:var(--muted);font-size:.75rem;line-height:1.45}.text-button{background:transparent;border:0;color:var(--coral);font-weight:700}.preview{margin:.8rem 0}.preview img{aspect-ratio:16/7;border-radius:.7rem;display:block;object-fit:cover;width:100%}.preview figcaption{color:var(--muted);font-size:.72rem;margin-top:.4rem}.placeholder{align-items:center;background:linear-gradient(135deg,#efe4d4,#dce8e4);border-radius:.7rem;color:var(--deep);display:flex;gap:.7rem;justify-content:center;margin:.8rem 0;min-height:110px;padding:1rem;text-align:center}.placeholder span{font-size:2rem}.media-tabs{border-bottom:1px solid var(--line);display:flex;gap:1rem;margin:.8rem 0}.media-tabs button{background:transparent;border:0;border-bottom:2px solid transparent;color:var(--muted);padding:.6rem 0}.media-tabs button.active{border-color:var(--coral);color:var(--ink);font-weight:700}.upload-panel{display:grid;gap:.8rem}.file-button{border:1px dashed var(--deep);border-radius:.65rem;color:var(--deep);cursor:pointer;padding:.8rem;text-align:center}.file-button input{height:1px;opacity:0;position:absolute;width:1px}.rights{align-items:flex-start;display:flex;font-size:.78rem;gap:.55rem;line-height:1.45}.search-panel label{display:block;font-size:.75rem;font-weight:700;margin-bottom:.35rem}.search-panel>div{display:flex;gap:.5rem}.search-panel input{flex:1}.results{display:grid;gap:.7rem;grid-template-columns:repeat(3,1fr);margin-top:1rem}.results article{background:var(--cream);border:1px solid var(--line);border-radius:.7rem;overflow:hidden}.results img{aspect-ratio:4/3;display:block;object-fit:cover;width:100%}.results article>div{display:flex;flex-direction:column;gap:.35rem;padding:.65rem}.results strong{font-size:.78rem}.results small,.results a{font-size:.68rem}.results a{color:var(--deep)}@media(max-width:650px){.results{grid-template-columns:1fr 1fr}.search-panel>div{align-items:stretch;flex-direction:column}}
  `,
})
export class MediaPickerComponent {
  private readonly api = inject(Api);
  readonly initialUrl = input<string | null>(null);
  readonly initialAssetId = input<string | null>(null);
  readonly defaultQuery = input('');
  readonly selectionChange = output<MediaSelection>();
  readonly mode = signal<'upload' | 'search'>('upload');
  readonly file = signal<File | null>(null);
  readonly results = signal<MediaSearchResultDto[]>([]);
  readonly asset = signal<MediaAssetResponseDto | null>(null);
  readonly removed = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  rightsConfirmed = false;
  query = '';

  readonly preview = () =>
    this.removed()
      ? null
      :
    this.asset()?.contentUrl
      ? this.absolute(this.asset()!.contentUrl)
      : this.initialAssetId()
        ? this.initialUrl()
        : this.initialUrl();

  chooseFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.error.set(null);
    if (
      file &&
      (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 8 * 1024 * 1024)
    ) {
      this.file.set(null);
      this.error.set('Selecciona un JPEG, PNG o WebP de hasta 8 MB.');
      return;
    }
    this.file.set(file);
  }

  async upload(): Promise<void> {
    const file = this.file();
    if (!file || !this.rightsConfirmed) return;
    await this.run(async () => {
      const asset = await this.api.invoke(mediaControllerUpload, {
        body: { file, rightsConfirmed: true },
      });
      this.select(asset);
    });
  }

  async search(): Promise<void> {
    const query = this.query.trim() || this.defaultQuery().trim();
    if (query.length < 3) return;
    await this.run(async () => {
      this.results.set(
        await this.api.invoke(mediaControllerSearch, { q: query }),
      );
    });
  }

  async importResult(result: MediaSearchResultDto): Promise<void> {
    await this.run(async () => {
      const asset = await this.api.invoke(mediaControllerImportOpenverse, {
        openverseId: result.id,
      });
      this.select(asset);
    });
  }

  clear(): void {
    this.asset.set(null);
    this.removed.set(true);
    this.selectionChange.emit({ assetId: null, url: null });
  }

  private select(asset: MediaAssetResponseDto): void {
    const normalized = { ...asset, contentUrl: this.absolute(asset.contentUrl) };
    this.asset.set(normalized);
    this.removed.set(false);
    this.selectionChange.emit({
      assetId: asset.id,
      url: normalized.contentUrl,
    });
  }

  absolute(url: string): string {
    if (/^https?:\/\//.test(url)) return url;
    if (this.api.rootUrl && url.startsWith(`${this.api.rootUrl}/`)) return url;
    return `${this.api.rootUrl.replace(/\/$/, '')}${url}`;
  }

  private async run(operation: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await operation();
    } catch {
      this.error.set('No se pudo completar la operación de imagen.');
    } finally {
      this.busy.set(false);
    }
  }
}
