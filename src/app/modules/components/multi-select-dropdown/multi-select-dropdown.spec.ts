import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiSelectDropdown } from './multi-select-dropdown';

describe('MultiSelectDropdown', () => {
  let component: MultiSelectDropdown;
  let fixture: ComponentFixture<MultiSelectDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiSelectDropdown],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiSelectDropdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
