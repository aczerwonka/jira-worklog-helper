import { Component, OnInit, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorklogService } from '../services/worklog.service';
import { FavoriteWorklog } from '../models/worklog.model';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss'],
})
export class FavoritesComponent implements OnInit {
  favorites = signal<FavoriteWorklog[]>([]);
  isEditing = signal(false);
  editingId = signal<string | null>(null);
  favoriteForm!: FormGroup;
  
  // Output event when a favorite is selected
  favoriteSelected = output<FavoriteWorklog>();

  constructor(
    private fb: FormBuilder,
    private worklogService: WorklogService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadFavorites();
  }

  private initForm(): void {
    this.favoriteForm = this.fb.group({
      ticketKey: ['', [Validators.required]],
      comment: ['', [Validators.required]],
      defaultTimeMinutes: [30, [Validators.required, Validators.min(1)]],
    });
  }

  loadFavorites(): void {
    this.worklogService.getFavoriteWorklogs().subscribe({
      next: (data) => this.favorites.set(data),
      error: (err) => console.error('Error loading favorites', err),
    });
  }

  startAdd(): void {
    this.isEditing.set(true);
    this.editingId.set(null);
    this.favoriteForm.reset({ defaultTimeMinutes: 30 });
  }

  startEdit(favorite: FavoriteWorklog): void {
    this.isEditing.set(true);
    this.editingId.set(favorite.id || null);
    this.favoriteForm.patchValue({
      ticketKey: favorite.ticketKey,
      comment: favorite.comment,
      defaultTimeMinutes: favorite.defaultTimeMinutes,
    });
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.favoriteForm.reset();
  }

  saveFavorite(): void {
    if (this.favoriteForm.invalid) {
      alert('Please fill in all required fields');
      return;
    }

    const favoriteData: FavoriteWorklog = this.favoriteForm.value;
    const editingId = this.editingId();

    if (editingId) {
      // Update existing favorite
      this.worklogService.updateFavoriteWorklog(editingId, favoriteData).subscribe({
        next: () => {
          this.loadFavorites();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error updating favorite', err);
          alert('Error updating favorite: ' + (err.error?.message || err.message));
        },
      });
    } else {
      // Add new favorite
      if (this.favorites().length >= 10) {
        alert('Maximum 10 favorites allowed');
        return;
      }
      
      this.worklogService.addFavoriteWorklog(favoriteData).subscribe({
        next: () => {
          this.loadFavorites();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error adding favorite', err);
          alert('Error adding favorite: ' + (err.error?.message || err.message));
        },
      });
    }
  }

  deleteFavorite(favorite: FavoriteWorklog): void {
    if (!favorite.id) return;
    
    if (!confirm(`Delete favorite "${favorite.ticketKey}"?`)) {
      return;
    }

    this.worklogService.deleteFavoriteWorklog(favorite.id).subscribe({
      next: () => this.loadFavorites(),
      error: (err) => {
        console.error('Error deleting favorite', err);
        alert('Error deleting favorite: ' + (err.error?.message || err.message));
      },
    });
  }

  selectFavorite(favorite: FavoriteWorklog): void {
    this.favoriteSelected.emit(favorite);
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }

  canAddMore(): boolean {
    return this.favorites().length < 10;
  }
}
