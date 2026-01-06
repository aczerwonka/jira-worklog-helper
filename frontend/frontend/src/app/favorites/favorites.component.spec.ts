import { TestBed } from '@angular/core/testing';
import { FavoritesComponent } from './favorites.component';
import { WorklogService } from '../services/worklog.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';

describe('FavoritesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoritesComponent],
      providers: [WorklogService, provideHttpClient()],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(FavoritesComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should format time correctly', () => {
    const fixture = TestBed.createComponent(FavoritesComponent);
    const component = fixture.componentInstance;

    expect(component.formatTime(30)).toBe('30m');
    expect(component.formatTime(60)).toBe('1h');
    expect(component.formatTime(90)).toBe('1h 30m');
    expect(component.formatTime(120)).toBe('2h');
  });

  it('should not allow more than 10 favorites', () => {
    const fixture = TestBed.createComponent(FavoritesComponent);
    const component = fixture.componentInstance;

    // Set 10 favorites
    component.favorites.set(
      Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `id-${i}`,
          ticketKey: `PROJ-${i}`,
          comment: `Comment ${i}`,
          defaultTimeMinutes: 30,
        }))
    );

    expect(component.canAddMore()).toBe(false);

    // Set 9 favorites
    component.favorites.set(
      Array(9)
        .fill(null)
        .map((_, i) => ({
          id: `id-${i}`,
          ticketKey: `PROJ-${i}`,
          comment: `Comment ${i}`,
          defaultTimeMinutes: 30,
        }))
    );

    expect(component.canAddMore()).toBe(true);
  });
});
